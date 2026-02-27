import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import ProviderProfile from "@/models/ProviderProfile";
import { calculateCommission } from "@/lib/commission";
import { pushStatusUpdateMany } from "@/lib/events";
import { activityRepository } from "@/repositories";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
  ValidationError,
} from "@/lib/errors";
import type { IJob } from "@/types";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");

  const { id } = await params;
  const body = await req.json();
  const releaseAmount = Number(body.amount);

  if (!releaseAmount || releaseAmount <= 0) throw new ValidationError("Must be a positive number");

  await connectDB();

  const jobDoc = await Job.findOne({ _id: id, clientId: user.userId });
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & { save(): Promise<void> };

  if (job.clientId.toString() !== user.userId) throw new ForbiddenError();
  if (job.status !== "completed") throw new UnprocessableError("Job must be marked as completed by the provider first");
  if (job.escrowStatus !== "funded") throw new UnprocessableError("Escrow must be in funded state for partial release");
  if (releaseAmount > job.budget) throw new ValidationError(`Cannot exceed job budget of ${job.budget}`);

  const { commission, netAmount } = calculateCommission(releaseAmount);

  // Save partial release and close escrow
  await Job.collection.updateOne(
    { _id: jobDoc._id },
    { $set: { escrowStatus: "released", partialReleaseAmount: releaseAmount } }
  );

  // Create completed transaction for partial amount
  await Transaction.create({
    jobId: job._id,
    payerId: user.userId,
    payeeId: job.providerId,
    amount: releaseAmount,
    commission,
    netAmount,
    status: "completed",
  });

  // Update provider performance metrics
  if (job.providerId) {
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
