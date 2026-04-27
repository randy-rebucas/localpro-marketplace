import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, UnprocessableError, ValidationError } from "@/lib/errors";
import {
  jobRepository,
  activityRepository,
  notificationRepository,
  quoteRepository,
  paymentRepository,
} from "@/repositories";
import { ledgerRepository } from "@/repositories/ledger.repository";
import { pushStatusUpdateMany, pushNotification } from "@/lib/events";
import { ledgerService } from "@/services/ledger.service";
import type { IJob } from "@/types";

import { checkRateLimit } from "@/lib/rateLimit";
const AdminCancelSchema = z.object({
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});

/** States from which an admin may cancel a job (wider than client cancellation). */
const ADMIN_CANCELLABLE_STATES = ["open", "assigned", "in_progress"];

/**
 * POST /api/admin/jobs/:id/cancel
 *
 * Admin-initiated job cancellation. Key differences from client cancellation:
 *   - Allowed from open, assigned, AND in_progress states
 *   - Full refund (no cancellation fee)
 *   - Both client and provider are notified
 *   - Audit trail includes admin identity and reason
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_jobs");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = AdminCancelSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { reason } = parsed.data;

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
    save(): Promise<void>;
  };

  if (!ADMIN_CANCELLABLE_STATES.includes(job.status)) {
    throw new UnprocessableError(
      `Cannot cancel a job with status "${job.status}". Admin cancellation is only allowed for open, assigned, or in_progress jobs.`
    );
  }

  const clientId = job.clientId.toString();
  const previousProviderId = job.providerId?.toString() ?? null;
  const hadFundedEscrow = job.escrowStatus === "funded";
  const jobBudget = (job as unknown as { budget: number }).budget;

  // ── Cancel the job ─────────────────────────────────────────────────────
  (job as unknown as { status: string }).status = "cancelled";
  (job as unknown as { cancelledBy: string }).cancelledBy = admin.userId;
  (job as unknown as { cancellationReason: string }).cancellationReason = reason;
  (job as unknown as { adminCancelled: boolean }).adminCancelled = true;

  // Full refund — no cancellation fee for admin cancellations
  if (hadFundedEscrow) {
    (job as unknown as { escrowStatus: string }).escrowStatus = "refunded";
  }

  await jobDoc.save();

  // ── Escrow refund (full amount to client wallet) ───────────────────────
  if (hadFundedEscrow) {
    const { walletService } = await import("@/services/wallet.service");
    const cancelJournalId = `admin-cancel-refund-${id}`;

    await walletService.credit(
      clientId,
      jobBudget,
      `Full refund — job cancelled by admin`,
      { jobId: id, silent: true, journalId: cancelJournalId }
    );
    await paymentRepository.markRefundedByJobId(id);

    // Post ledger entry for the refund
    try {
      const existingEntries = await ledgerRepository.findByJournalId(cancelJournalId);
      if (existingEntries.length === 0) {
        const { transactionRepository } = await import("@/repositories");
        const tx = await transactionRepository.findOneByJobId(id);
        const escrowBalance = tx
          ? (tx as unknown as { amount: number }).amount
          : jobBudget;
        await ledgerService.postDisputeRefund(
          {
            journalId: cancelJournalId,
            entityType: "job",
            entityId: id,
            clientId,
            initiatedBy: admin.userId,
          },
          escrowBalance
        );
      }
    } catch (err) {
      console.error(`[AdminCancelJob] Refund ledger post failed for job ${id}:`, err);
    }
  }

  // ── Reject all pending quotes ──────────────────────────────────────────
  await quoteRepository.rejectAllPending(id);

  // ── Activity log with admin audit trail ────────────────────────────────
  await activityRepository.log({
    userId: admin.userId,
    eventType: "job_cancelled" as never,
    jobId: id,
    metadata: {
      reason,
      cancelledBy: "admin",
      adminUserId: admin.userId,
      hadFundedEscrow,
      previousProviderId,
    },
  });

  // ── Notify client ─────────────────────────────────────────────────────
  const clientNote = await notificationRepository.create({
    userId: clientId,
    type: "job_update" as never,
    title: "Job cancelled by admin",
    message: `Your job has been cancelled by an administrator. Reason: ${reason}${hadFundedEscrow ? " A full refund has been issued to your wallet." : ""}`,
    data: { jobId: id },
  });
  pushNotification(clientId, clientNote);

  // ── Notify provider (if assigned) ─────────────────────────────────────
  if (previousProviderId) {
    const providerNote = await notificationRepository.create({
      userId: previousProviderId,
      type: "job_update" as never,
      title: "Job cancelled by admin",
      message: `A job you were assigned to has been cancelled by an administrator. Reason: ${reason}`,
      data: { jobId: id },
    });
    pushNotification(previousProviderId, providerNote);
  }

  // ── Realtime updates ──────────────────────────────────────────────────
  const affected = [clientId, previousProviderId].filter(Boolean) as string[];
  pushStatusUpdateMany(affected, { entity: "job", id, status: "cancelled" });

  return NextResponse.json({
    message: hadFundedEscrow
      ? "Job cancelled by admin. Full escrow refund issued to client wallet."
      : "Job cancelled by admin.",
  });
});
