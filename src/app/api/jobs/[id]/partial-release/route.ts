import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import { getEffectiveCommissionRate } from "@/lib/serverCommission";
import { pushStatusUpdateMany } from "@/lib/events";
import {
  jobRepository,
  activityRepository,
  paymentRepository,
  transactionRepository,
  providerProfileRepository,
} from "@/repositories";
import { ledgerRepository } from "@/repositories/ledger.repository";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
  ValidationError,
  assertObjectId,
} from "@/lib/errors";
import { ledgerService } from "@/services/ledger.service";
import { checkRateLimit } from "@/lib/rateLimit";
import type { IJob } from "@/types";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");
  requireCsrfToken(req, user);

  const { id } = await params;
  assertObjectId(id, "jobId");

  const rl = await checkRateLimit(`job-partial-release:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();

  // M-1: Strict Zod validation — prevents Infinity, NaN, and floating-point drift
  const ReleaseSchema = z.object({
    amount: z.number().positive().finite().multipleOf(0.01, "Amount must be a valid peso/centavo value"),
  });
  const parsed = ReleaseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid amount");
  }
  const releaseAmount = parsed.data.amount;

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob;

  if (job.clientId.toString() !== user.userId) throw new ForbiddenError();
  if (job.status !== "completed") throw new UnprocessableError("Job must be marked as completed by the provider first");
  if (job.escrowStatus !== "funded") throw new UnprocessableError("Escrow must be in funded state for partial release");

  // Validate against actual funded amount, not job.budget (they may differ when escrow was funded at accepted quote price)
  const payment = await paymentRepository.findByJobId(id);
  const fundedAmount = payment?.amount ?? job.budget;
  if (releaseAmount > fundedAmount) throw new ValidationError(`Cannot exceed funded escrow of ₱${fundedAmount.toLocaleString()}`);

  // Use DB-backed, business-plan-aware commission rate (same as escrow funding path)
  const commissionRate = await getEffectiveCommissionRate(job.category, job.clientId.toString());
  const { commission, netAmount } = calculateCommission(releaseAmount, commissionRate);

  // Save partial release and close escrow
  await jobRepository.updateById(id, { $set: { escrowStatus: "released", partialReleaseAmount: releaseAmount } });

  // Resolve the original pending transaction created at escrow funding time,
  // then create a new completed transaction recording the actual partial payout.
  await transactionRepository.setPending(id, "refunded");
  const partialTx = await transactionRepository.create({
    jobId: job._id,
    payerId: user.userId,
    payeeId: job.providerId,
    amount: releaseAmount,
    commission,
    netAmount,
    status: "completed",
    chargeType: "partial_release",
    commissionRate,
  });

  // Post double-entry ledger journal for the partial release
  try {
    const refundedAmount = fundedAmount - releaseAmount;
    const journalId = `partial-release-${String(job._id)}`;
    await ledgerService.postPartialRelease(
      {
        journalId,
        entityType: "job",
        entityId: String(job._id),
        clientId: job.clientId.toString(),
        providerId: job.providerId?.toString(),
        initiatedBy: user.userId,
      },
      releaseAmount,
      commission,
      netAmount,
      refundedAmount
    );
    await transactionRepository.updateById(String(partialTx._id), { ledgerJournalId: journalId });
  } catch {
    // Non-critical — do not fail partial release if ledger write fails
  }

  // Update provider performance metrics
  if (job.providerId) {
    const providerId = job.providerId.toString();
    const [completedCount, totalCount] = await Promise.all([
      jobRepository.countByProvider(providerId, ["completed"]),
      jobRepository.countByProvider(providerId, ["completed", "cancelled", "refunded"]),
    ]);
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
    await providerProfileRepository.updateCompletionStats(providerId, completedCount, completionRate);
  }

  await activityRepository.log({
    userId: user.userId,
    eventType: "escrow_released",
    jobId: id,
  });

  const { notificationService } = await import("@/services/notification.service");
  if (job.providerId) {
    await notificationService.push({
      userId: job.providerId.toString(),
      type: "escrow_released",
      title: "Partial payment released",
      message: `The client released ₱${releaseAmount.toLocaleString()} of the ₱${job.budget.toLocaleString()} escrow.`,
      data: { jobId: id },
    });
  }

  pushStatusUpdateMany(
    [user.userId, job.providerId?.toString()].filter(Boolean) as string[],
    { entity: "job", id, escrowStatus: "released" }
  );

  return NextResponse.json({
    message: `Partial release of ₱${releaseAmount.toLocaleString()} sent to provider.`,
    releaseAmount,
    commission,
    netAmount,
  });
});
