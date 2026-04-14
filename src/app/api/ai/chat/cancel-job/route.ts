import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { isValidObjectId } from "mongoose";

/** POST /api/ai/chat/cancel-job - Cancel an active job */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { jobId } = await req.json();

  if (!jobId || !isValidObjectId(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  try {
    await connectDB();

    const job = await jobRepository.findById(jobId) as any;

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Only client can cancel their own job
    if (user.userId !== String(job.clientId)) {
      return NextResponse.json(
        { error: "Only the client can cancel this job" },
        { status: 403 }
      );
    }

    // Can only cancel if job is open or assigned
    if (!["open", "assigned", "pending_validation"].includes(job.status)) {
      return NextResponse.json(
        {
          error: `Cannot cancel a job that is ${job.status}`,
          currentStatus: job.status,
        },
        { status: 400 }
      );
    }

    // Update job status to cancelled
    const cancelled = await jobRepository.updateById(job._id, {
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
        job.status === "pending_validation" ||
        job.status === "open"
          ? "Any payments will be refunded to your wallet."
          : "The assigned provider has been notified of the cancellation.",
    });
  } catch (err) {
    console.error("[cancel-job] error:", err);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
});
