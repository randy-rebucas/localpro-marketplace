import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, UnprocessableError, assertObjectId } from "@/lib/errors";
import { jobRepository, transactionRepository, activityRepository, notificationRepository, quoteRepository } from "@/repositories";
import { calculateCommission, getCommissionRate } from "@/lib/commission";
import { pushStatusUpdateMany, pushNotification } from "@/lib/events";
import { ledgerService } from "@/services/ledger.service";
import type { IJob } from "@/types";

import { checkRateLimit } from "@/lib/rateLimit";
const OverrideSchema = z.object({
  action: z.enum(["release", "refund", "reopen"]),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "jobId");

  const body = await req.json().catch(() => ({}));
  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { action, reason } = parsed.data;

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & { save(): Promise<void> };

  if (job.escrowStatus !== "funded") {
    throw new UnprocessableError("Escrow must be in 'funded' state to override");
  }

  if (action === "reopen") {
    // Re-open the job to the board. Escrow stays "funded" so the client does
    // NOT need to pay again when a new provider accepts the job.
    const previousProviderId = job.providerId?.toString();
    job.status = "open";
    (job as unknown as { providerId: null }).providerId = null;
    await jobDoc.save();

    const clientNote = await notificationRepository.create({
      userId: job.clientId.toString(),
      type: "job_update" as never,
      title: "Job re-opened by admin",
      message: `Your job has been re-opened by an admin and is now visible to new providers. Reason: ${reason}`,
      data: { jobId: id },
    });
    pushNotification(job.clientId.toString(), clientNote);

    if (previousProviderId) {
      const providerNote = await notificationRepository.create({
        userId: previousProviderId,
        type: "job_update" as never,
        title: "Job re-assigned by admin",
        message: `You have been unassigned from a job by an admin. Reason: ${reason}`,
        data: { jobId: id },
      });
      pushNotification(previousProviderId, providerNote);
    }

    // Reject the displaced provider's quote so it no longer appears accepted
    if (previousProviderId) {
      await quoteRepository.rejectByProvider(id, previousProviderId);
    }

    await activityRepository.log({
      userId: user.userId,
      eventType: "escrow_released",
      jobId: id,
      metadata: { adminOverride: true, action: "reopen", reason },
    });

    const affected = [job.clientId.toString(), previousProviderId].filter(Boolean) as string[];
    pushStatusUpdateMany(affected, { entity: "job", id, status: "open" });

    return NextResponse.json({ message: "Job re-opened successfully" });
  }

  if (action === "release") {
    job.escrowStatus = "released";
    if (job.status !== "completed") job.status = "completed";
    await jobDoc.save();

    // Ensure a transaction record exists (for non-PayMongo or edge cases)
    const existingTxn = await transactionRepository.findOneByJobId(id);
    if (!existingTxn && job.providerId) {
      const { commission, netAmount } = calculateCommission(job.budget, getCommissionRate(job.category));
      await transactionRepository.create({
        jobId: job._id,
        payerId: job.clientId,
        payeeId: job.providerId,
        amount: job.budget,
        commission,
        netAmount,
        status: "completed",
      });
    } else if (existingTxn) {
      await transactionRepository.updateById(
        (existingTxn._id as { toString(): string }).toString(),
        { status: "completed" }
      );
    }

    // Post ledger: admin escrow release (same flow as normal release)
    try {
      const tx = existingTxn ?? await transactionRepository.findOneByJobId(id);
      const { commission, netAmount } = tx
        ? { commission: (tx as unknown as { commission: number }).commission, netAmount: (tx as unknown as { netAmount: number }).netAmount }
        : calculateCommission(job.budget, getCommissionRate(job.category));
      await ledgerService.postEscrowReleased(
        {
          journalId: `admin-release-${id}`,
          entityType: "job",
          entityId: id,
          clientId: job.clientId.toString(),
          providerId: job.providerId?.toString(),
          initiatedBy: user.userId,
        },
        job.budget,
        commission,
        netAmount
      );
    } catch { /* non-critical */ }

    const notifBase = { data: { jobId: id }, type: "escrow_released" as const };
    const clientNote = await notificationRepository.create({
      userId: job.clientId.toString(),
      ...notifBase,
      title: "Escrow released by admin",
      message: `Payment for your job has been released by an admin. Reason: ${reason}`,
    });
    pushNotification(job.clientId.toString(), clientNote);

    if (job.providerId) {
      const providerNote = await notificationRepository.create({
        userId: job.providerId.toString(),
        ...notifBase,
        title: "Payment released",
        message: `Escrow payment has been released to you by admin. Reason: ${reason}`,
      });
      pushNotification(job.providerId.toString(), providerNote);
    }
  } else {
    // refund — credit client wallet instead of reversing via PayMongo
    job.escrowStatus = "refunded";
    job.status = "refunded";
    await jobDoc.save();

    await transactionRepository.updateManyByJobId(id, { $set: { status: "refunded" } });

    const { walletService } = await import("@/services/wallet.service");
    const { paymentRepository } = await import("@/repositories");
    const refundAmount = (job as unknown as { budget: number }).budget;
    const refundJournalId = `admin-refund-${id}`;
    await walletService.credit(
      job.clientId.toString(),
      refundAmount,
      `Admin escrow refund — Job #${id.slice(-6)}`,
      { jobId: id, silent: true, journalId: refundJournalId }
    );
    await paymentRepository.markRefundedByJobId(id);

    // Post ledger: admin escrow refund to client wallet
    try {
      await ledgerService.postDisputeRefund(
        {
          journalId: refundJournalId,
          entityType: "job",
          entityId: id,
          clientId: job.clientId.toString(),
          providerId: job.providerId?.toString(),
          initiatedBy: user.userId,
        },
        refundAmount
      );
    } catch { /* non-critical */ }

    const clientNote = await notificationRepository.create({
      userId: job.clientId.toString(),
      type: "payment_confirmed",
      title: "Escrow refunded to your wallet",
      message: `Your escrow payment has been refunded to your platform wallet by admin. Reason: ${reason}`,
      data: { jobId: id },
    });
    pushNotification(job.clientId.toString(), clientNote);
  }

  await activityRepository.log({
    userId: user.userId,
    eventType: "escrow_released",
    jobId: id,
    metadata: { adminOverride: true, action, reason },
  });

  const participants = [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[];
  pushStatusUpdateMany(participants, {
    entity: "job",
    id,
    escrowStatus: action === "release" ? "released" : "refunded",
    status: action === "release" ? "completed" : "refunded",
  });

  return NextResponse.json({ message: `Escrow ${action === "release" ? "released" : "refunded"} successfully` });
});
