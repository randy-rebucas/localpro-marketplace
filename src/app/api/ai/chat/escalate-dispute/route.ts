import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { enqueueNotification } from "@/lib/notification-queue";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { jobId, reason, severity } = body;

    // Validate required fields
    if (!jobId || !reason) {
      return NextResponse.json(
        { error: "Missing jobId or dispute reason" },
        { status: 400 }
      );
    }

    // Fetch the job
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify user owns this job
    if (job.clientId.toString() !== user.userId.toString()) {
      return NextResponse.json(
        { error: "You do not have permission to escalate this dispute" },
        { status: 403 }
      );
    }

    // Check if job is already in dispute
    if (job.status === "disputed") {
      return NextResponse.json(
        { error: "This job is already under dispute resolution" },
        { status: 400 }
      );
    }

    // Update job with dispute info
    job.status = "disputed";
    // Note: Full dispute tracking stored in separate Dispute model (future implementation)
    // For now, we're simply marking the job as disputed
    // updatedAt timestamp will be automatically set by Mongoose
    await job.save();

    // Notify support team
    await enqueueNotification({
      userId: "support-team",
      channel: "email",
      category: "DISPUTE",
      subject: `Dispute Escalation for Job ${jobId}`,
      body: `Dispute reason: ${reason}\nSeverity: ${severity || "medium"}`,
      immediate: true,
    });

    // Notify provider
    if (job.providerId) {
      await enqueueNotification({
        userId: job.providerId.toString(),
        channel: "push",
        category: "DISPUTE",
        subject: "Job Dispute Escalated",
        body: `A dispute has been escalated for your job: ${reason}`,
        immediate: true,
      });
    }

    return NextResponse.json({
      message: `Your dispute has been escalated to our support team. A support specialist will contact you within 24 hours to help resolve this matter.\n\nDispute ID: ESC-${jobId.slice(-8).toUpperCase()}\nSeverity: ${severity || "medium"}\n\nYou can track the status in your account dashboard.`,
      disputeId: `ESC-${jobId.slice(-8).toUpperCase()}`,
      jobStatus: "disputed",
      nextAction: "DISPUTE_ESCALATED",
    });
  } catch (error) {
    console.error("[AI Chat] Dispute escalation failed:", error);
    return NextResponse.json(
      { error: "Failed to escalate dispute" },
      { status: 500 }
    );
  }
}
