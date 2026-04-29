import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories";
import { enqueueNotification } from "@/lib/notification-queue";
import { checkRateLimit } from "@/lib/rateLimit";
import { assertObjectId, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:escalate-dispute:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { jobId, reason, severity } = body;

  assertObjectId(jobId, "jobId");
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    throw new ValidationError("A dispute reason is required");
  }

  const job = await jobRepository.findById(jobId) as any;
  if (!job) throw new NotFoundError("Job not found");

  if (job.clientId.toString() !== user.userId) {
    throw new ForbiddenError("You do not have permission to escalate this dispute");
  }

  if (job.status === "disputed") {
    throw new ValidationError("This job is already under dispute resolution");
  }

  await jobRepository.updateById(job._id, { status: "disputed" });

  await enqueueNotification({
    userId: "support-team",
    channel: "email",
    category: "DISPUTE",
    subject: `Dispute Escalation for Job ${jobId}`,
    body: `Dispute reason: ${reason.slice(0, 500)}\nSeverity: ${severity || "medium"}`,
    immediate: true,
  });

  if (job.providerId) {
    await enqueueNotification({
      userId: job.providerId.toString(),
      channel: "push",
      category: "DISPUTE",
      subject: "Job Dispute Escalated",
      body: "A dispute has been escalated for your job. Our support team will review it shortly.",
      immediate: true,
    });
  }

  return NextResponse.json({
    message: `Your dispute has been escalated to our support team. A support specialist will contact you within 24 hours to help resolve this matter.\n\nDispute ID: ESC-${jobId.slice(-8).toUpperCase()}\nSeverity: ${severity || "medium"}\n\nYou can track the status in your account dashboard.`,
    disputeId: `ESC-${jobId.slice(-8).toUpperCase()}`,
    jobStatus: "disputed",
    nextAction: "DISPUTE_ESCALATED",
  });
});
