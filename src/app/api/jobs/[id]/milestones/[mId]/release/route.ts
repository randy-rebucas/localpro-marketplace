import { type NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { calculateCommission, getCommissionRate } from "@/lib/commission";
import { pushStatusUpdateMany } from "@/lib/events";
import {
  jobRepository,
  activityRepository,
  transactionRepository,
  providerProfileRepository,
} from "@/repositories";
import { NotFoundError, ForbiddenError, UnprocessableError, assertObjectId } from "@/lib/errors";
import { ledgerService } from "@/services/ledger.service";
import { checkRateLimit } from "@/lib/rateLimit";
import type { IJob, IMilestone } from "@/types";

type Ctx = { params: Promise<{ id: string; mId: string }> };

/**
 * POST /api/jobs/:id/milestones/:mId/release
 *
 * Releases a single pending milestone, transferring its amount (minus commission)
 * to the provider. If all milestones are now released the job escrowStatus is
 * set to "released".
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: Ctx
) => {
  const { id, mId } = await params;
  assertObjectId(id, "jobId");
  assertObjectId(mId, "milestoneId");
  const user = await requireUser();
  requireRole(user, "client");
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`milestone-release:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    _id: { toString(): string };
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
    milestones: (IMilestone & { _id: { toString(): string } })[];
  };

  if (job.clientId.toString() !== user.userId) throw new ForbiddenError();
  if (job.escrowStatus !== "funded") {
    throw new UnprocessableError("Escrow must be funded to release a milestone");
  }
  if (job.status !== "completed") {
    throw new UnprocessableError("Provider must mark the job as complete before milestones can be released");
  }

  const milestoneIndex = (job.milestones ?? []).findIndex(
    (m) => m._id.toString() === mId
  );
  if (milestoneIndex === -1) throw new NotFoundError("Milestone");

  const milestone = job.milestones[milestoneIndex];
  if (milestone.status === "released") {
    throw new UnprocessableError("Milestone has already been released");
  }

  const { commission, netAmount } = calculateCommission(milestone.amount, getCommissionRate(job.category));

  // Mark the milestone as released
  const updatedMilestones = [...job.milestones];
  updatedMilestones[milestoneIndex] = {
    title: milestone.title,
    amount: milestone.amount,
    description: milestone.description ?? "",
    status: "released",
    releasedAt: new Date(),
    _id: milestone._id,
  } as unknown as typeof milestone;

  // Check if all milestones are now released → close escrow
  const allReleased = updatedMilestones.every((m) => m.status === "released");
  const newEscrowStatus = allReleased ? "released" : "funded";

  await jobRepository.updateById(id, { $set: { milestones: updatedMilestones, escrowStatus: newEscrowStatus } });

  // Resolve the original pending transaction (created at escrow funding) when
  // all milestones are done — each milestone creates its own completed tx below.
  if (allReleased) {
    await transactionRepository.setPending(id, "refunded");
  }

  // Record the transaction
  const milestoneTx = await transactionRepository.create({
    jobId: job._id,
    payerId: user.userId,
    payeeId: job.providerId,
    amount: milestone.amount,
    commission,
    netAmount,
    status: "completed",
    chargeType: "milestone_release",
  });

  // Post double-entry ledger journal for this milestone
  try {
    const journalId = `milestone-release-${String(job._id)}-${mId}`;
    await ledgerService.postMilestoneRelease(
      {
        journalId,
        entityType: "job",
        entityId: String(job._id),
        clientId: job.clientId.toString(),
        providerId: job.providerId?.toString() ?? null,
        initiatedBy: user.userId,
      },
      milestone.amount,
      commission,
      netAmount
    );
    await transactionRepository.updateById(String(milestoneTx._id), { ledgerJournalId: journalId });
  } catch {
    // Non-critical — do not fail milestone release if ledger write fails
  }

  // Update provider metrics if escrow fully released
  if (allReleased && job.providerId) {
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
    metadata: { milestoneId: mId, amount: milestone.amount, allReleased },
  });

  const { notificationService } = await import("@/services/notification.service");
  if (job.providerId) {
    await notificationService.push({
      userId: job.providerId.toString(),
      type: "escrow_released",
      title: allReleased ? "Full payment released" : "Milestone payment released",
      message: allReleased
        ? `All milestone payments have been released. Total: ₱${updatedMilestones.reduce((s, m) => s + m.amount, 0).toLocaleString()}.`
        : `Milestone "${milestone.title}" — ₱${milestone.amount.toLocaleString()} has been released.`,
      data: { jobId: id },
    });
  }

  pushStatusUpdateMany(
    [user.userId, job.providerId?.toString()].filter(Boolean) as string[],
    { entity: "job", id, escrowStatus: newEscrowStatus }
  );

  return NextResponse.json({
    message: `Milestone "${milestone.title}" released — ₱${netAmount.toLocaleString()} sent to provider.`,
    milestoneId: mId,
    amount: milestone.amount,
    commission,
    netAmount,
    allReleased,
  });
});
