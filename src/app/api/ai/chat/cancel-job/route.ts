import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories";
import { checkRateLimit } from "@/lib/rateLimit";
import { assertObjectId, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

/** POST /api/ai/chat/cancel-job - Cancel an active job */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:cancel-job:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { jobId } = await req.json();
  assertObjectId(jobId, "jobId");

  const job = await jobRepository.findById(jobId) as any;
  if (!job) throw new NotFoundError("Job not found");

  if (user.userId !== String(job.clientId)) throw new ForbiddenError("Only the client can cancel this job");

  if (!["open", "assigned", "pending_validation"].includes(job.status)) {
    throw new ValidationError(`Cannot cancel a job that is ${job.status}`);
  }

  await jobRepository.updateById(job._id, {
    status: "cancelled",
    cancelledAt: new Date(),
    cancelledBy: user.userId,
  });

  return NextResponse.json({
    success: true,
    jobId: String(job._id),
    previousStatus: job.status,
    newStatus: "cancelled",
    message: "Your job request has been cancelled successfully.",
    refundInfo:
      job.status === "pending_validation" || job.status === "open"
        ? "Any payments will be refunded to your wallet."
        : "The assigned provider has been notified of the cancellation.",
  });
});
