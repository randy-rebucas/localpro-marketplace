import { type NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import ProviderProfile from "@/models/ProviderProfile";
import { calculateCommission, getCommissionRate } from "@/lib/commission";
import { pushStatusUpdateMany } from "@/lib/events";
import { activityRepository, transactionRepository } from "@/repositories";
import { NotFoundError, ForbiddenError, UnprocessableError } from "@/lib/errors";
import { ledgerService } from "@/services/ledger.service";
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
  _req: NextRequest,
  { params }: Ctx
) => {
  const { id, mId } = await params;
  const user = await requireUser();
  requireRole(user, "client");

  await connectDB();

  const jobDoc = await Job.findOne({ _id: id, clientId: user.userId });
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    _id: { toString(): string };
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
    milestones: (IMilestone & { _id: { toString(): string } })[];
    save(): Promise<void>;
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
  job.milestones[milestoneIndex] = {
    title: milestone.title,
    amount: milestone.amount,
    description: milestone.description ?? "",
    status: "released",
    releasedAt: new Date(),
    _id: milestone._id,
  };

  // Check if all milestones are now released → close escrow
  const allReleased = job.milestones.every((m) => m.status === "released");
  (jobDoc as unknown as { escrowStatus: string }).escrowStatus = allReleased ? "released" : "funded";

  await jobDoc.save();

  // Resolve the original pending transaction (created at escrow funding) when
  // all milestones are done — each milestone creates its own completed tx below.
  if (allReleased) {
    await transactionRepository.setPending(id, "refunded");
  }

  // Record the transaction
  const milestoneTx = await Transaction.create({
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
    const journalId = `milestone-release-${job._id!.toString()}-${mId}`;
    await ledgerService.postMilestoneRelease(
      {
        journalId,
        entityType: "job",
        entityId: job._id!.toString(),
        clientId: job.clientId.toString(),
        providerId: job.providerId?.toString() ?? null,
        initiatedBy: user.userId,
      },
      milestone.amount,
      commission,
      netAmount
    );
    // Link transaction to ledger journal
    await Transaction.updateOne({ _id: milestoneTx._id }, { ledgerJournalId: journalId });
  } catch {
    // Non-critical — do not fail milestone release if ledger write fails
  }

  // Update provider metrics if escrow fully released
  if (allReleased && job.providerId) {
    const providerId = job.providerId.toString();
    const [completedCount, totalCount] = await Promise.all([
      Job.countDocuments({ providerId, status: "completed" }),
      Job.countDocuments({ providerId, status: { $in: ["completed", "cancelled", "refunded"] } }),
    ]);
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
    await ProviderProfile.updateOne(
      { userId: providerId },
      { $set: { completedJobCount: completedCount, completionRate } }
    );
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
        ? `All milestone payments have been released. Total: ₱${job.milestones.reduce((s, m) => s + m.amount, 0).toLocaleString()}.`
        : `Milestone "${milestone.title}" — ₱${milestone.amount.toLocaleString()} has been released.`,
      data: { jobId: id },
    });
  }

  pushStatusUpdateMany(
    [user.userId, job.providerId?.toString()].filter(Boolean) as string[],
    { entity: "job", id, escrowStatus: allReleased ? "released" : "funded" }
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
