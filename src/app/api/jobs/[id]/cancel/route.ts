import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, NotFoundError, UnprocessableError, ValidationError } from "@/lib/errors";
import { canTransition } from "@/lib/jobLifecycle";
import { getPaymentSettings } from "@/lib/appSettings";
import { calculateCancellationFee } from "@/lib/commission";
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

const CancelSchema = z.object({
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});

/**
 * POST /api/jobs/:id/cancel
 *
 * Client-initiated job closure. Allowed when:
 *   - status = "open"            → no provider involved, just cancel
 *   - status = "assigned"        → provider accepted but not yet started
 *                                  (escrow refunded automatically if already funded)
 *
 * NOT allowed once in_progress or beyond — use dispute flow instead.
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { reason } = parsed.data;

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
    save(): Promise<void>;
  };

  // Only the job's client can cancel
  if (job.clientId.toString() !== user.userId) {
    throw new ForbiddenError("Only the job owner can cancel this job");
  }

  // Guard: only open or assigned jobs can be cancelled
  if (!["open", "assigned"].includes(job.status)) {
    throw new UnprocessableError(
      `Cannot cancel a job with status "${job.status}". Jobs that are already in progress must be handled via a dispute.`
    );
  }

  // Validate lifecycle transition
  const check = canTransition(job as unknown as IJob, "cancelled");
  if (!check.allowed) {
    throw new UnprocessableError(check.reason ?? "Cannot cancel this job");
  }

  const previousProviderId = job.providerId?.toString() ?? null;
  const hadFundedEscrow = job.escrowStatus === "funded";
  const jobBudget = (job as unknown as { budget: number }).budget;
  const jobScheduleDate = (job as unknown as { scheduleDate: Date | null }).scheduleDate;
  const isAssignedCancel = job.status === "assigned" && !!previousProviderId;

  // Calculate cancellation fee (only for assigned jobs with a funded escrow)
  let cancellationFee = 0;
  let cancellationProviderShare = 0;

  if (isAssignedCancel && hadFundedEscrow) {
    const paySettings = await getPaymentSettings();
    const breakdown = calculateCancellationFee(
      jobBudget,
      jobScheduleDate,
      paySettings["payments.cancellationWindowFreeHours"],
      paySettings["payments.cancellationWindowFlatHours"],
      paySettings["payments.cancellationWindowPercentHours"],
      paySettings["payments.cancellationFeeFlat"],
      paySettings["payments.cancellationFeePercent"]
    );
    cancellationFee          = breakdown.fee;
    cancellationProviderShare = breakdown.providerShare;
  }

  // Cancel the job
  (job as unknown as { status: string }).status = "cancelled";

  if (cancellationFee > 0) {
    (job as unknown as { cancellationFee: number }).cancellationFee = cancellationFee;
  }

  // If escrow was funded, mark it as refunded on the job record
  if (hadFundedEscrow) {
    (job as unknown as { escrowStatus: string }).escrowStatus = "refunded";
  }

  await jobDoc.save();

  // If escrow was funded, credit the client's wallet instead of reversing via PayMongo
  if (hadFundedEscrow) {
    const { walletService } = await import("@/services/wallet.service");
    const cancelJournalId = `cancel-refund-${id}`;
    const netRefundToClient = jobBudget - cancellationFee;

    // Post cancellation fee ledger + credit provider wallet (if applicable)
    if (cancellationFee > 0 && previousProviderId) {
      try {
        const feeJournalId = `${cancelJournalId}-fee`;
        const existingFeeEntries = await ledgerRepository.findByJournalId(feeJournalId);
        if (existingFeeEntries.length === 0) {
          await ledgerService.postCancellationFee(
            {
              journalId:   feeJournalId,
              entityType:  "job",
              entityId:    id,
              clientId:    user.userId,
              providerId:  previousProviderId,
              initiatedBy: user.userId,
            },
            cancellationFee,
            cancellationProviderShare
          );
          if (cancellationProviderShare > 0) {
            await walletService.credit(
              previousProviderId,
              cancellationProviderShare,
              `Cancellation compensation — job cancelled by client`,
              { jobId: id, silent: false, journalId: `${cancelJournalId}-fee-provider` }
            );
          }
        }
      } catch (err) {
        console.error(`[CancelJob] Cancellation fee ledger/wallet post failed for job ${id}:`, err);
      }
    }

    await walletService.credit(
      user.userId,
      netRefundToClient,
      `Refund — job cancelled${cancellationFee > 0 ? ` (₱${cancellationFee.toLocaleString()} cancellation fee deducted)` : ""}`,
      { jobId: id, silent: true, journalId: cancelJournalId }
    );
    await paymentRepository.markRefundedByJobId(id);
    // Post ledger: DR 2000 Escrow Payable → CR 2200 Wallet Payable (net escrow returned to client)
    try {
      const existingRefundEntries = await ledgerRepository.findByJournalId(cancelJournalId);
      if (existingRefundEntries.length === 0) {
        const { transactionRepository } = await import("@/repositories");
        const tx = await transactionRepository.findOneByJobId(id);
        const escrowBalance = tx
          ? (tx as unknown as { amount: number }).amount
          : jobBudget;
        const netRefundLedger = Math.max(escrowBalance - cancellationFee, 0);
        await ledgerService.postDisputeRefund(
          {
            journalId:   cancelJournalId,
            entityType:  "job",
            entityId:    id,
            clientId:    user.userId,
            initiatedBy: user.userId,
          },
          netRefundLedger
        );
      }
    } catch (err) {
      console.error(`[CancelJob] Refund ledger post failed for job ${id}:`, err);
    }
  }

  // Reject all pending/accepted quotes for this job (open = multiple providers, assigned = one)
  await quoteRepository.rejectAllPending(id);

  // Activity log
  await activityRepository.log({
    userId:    user.userId,
    eventType: "job_cancelled" as never,
    jobId:     id,
    metadata:  { reason, hadFundedEscrow, previousProviderId },
  });

  // Notify assigned provider (if any)
  if (previousProviderId) {
    const feeNote = cancellationFee > 0
      ? ` You will receive ₱${cancellationProviderShare.toLocaleString()} as cancellation compensation.`
      : "";
    const note = await notificationRepository.create({
      userId:  previousProviderId,
      type:    "job_update" as never,
      title:   "Job cancelled by client",
      message: `The client has cancelled the job you were assigned to. Reason: ${reason}${feeNote}`,
      data:    { jobId: id },
    });
    pushNotification(previousProviderId, note);
  }

  // Realtime update to all affected parties
  const affected = [user.userId, previousProviderId].filter(Boolean) as string[];
  pushStatusUpdateMany(affected, { entity: "job", id, status: "cancelled" });

  return NextResponse.json({
    message: hadFundedEscrow
      ? cancellationFee > 0
        ? `Job cancelled. A cancellation fee of ₱${cancellationFee.toLocaleString()} was deducted. You will receive a refund of ₱${(jobBudget - cancellationFee).toLocaleString()}.`
        : "Job cancelled. Your escrow payment will be refunded."
      : "Job cancelled successfully.",
  });
});
