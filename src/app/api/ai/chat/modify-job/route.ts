import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories";
import { enqueueNotification } from "@/lib/notification-queue";
import { checkRateLimit } from "@/lib/rateLimit";
import { assertObjectId, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:modify-job:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { jobId, modifications } = body;

  assertObjectId(jobId, "jobId");
  if (!modifications) throw new ValidationError("Missing modifications");

  const job = await jobRepository.findById(jobId) as any;
  if (!job) throw new NotFoundError("Job not found");

  if (
    job.clientId.toString() !== user.userId &&
    job.providerId?.toString() !== user.userId
  ) {
    throw new ForbiddenError("You do not have permission to modify this job");
  }

  const modifiableStatuses = ["open", "assigned", "pending", "in_progress"];
  if (!modifiableStatuses.includes(job.status)) {
    throw new ValidationError(`Cannot modify job with status: ${job.status}`);
  }

  const changes: string[] = [];
  const updates: Record<string, unknown> = {};

  if (modifications.newDate) {
    const newDate = new Date(modifications.newDate);
    if (newDate < new Date()) throw new ValidationError("Cannot reschedule to a past date");
    changes.push(`Rescheduled from ${job.scheduleDate?.toLocaleDateString()} to ${newDate.toLocaleDateString()}`);
    updates.scheduleDate = newDate;
  }

  if (modifications.newTime) {
    changes.push(`Updated time to ${modifications.newTime}`);
  }

  if (modifications.scopeChange) {
    switch (modifications.scopeChange) {
      case "add": changes.push("Additional work added to scope"); break;
      case "remove": changes.push("Some work removed from scope"); break;
      case "reduce": changes.push("Scope reduced - fewer hours/materials"); break;
    }
  }

  if (Object.keys(updates).length > 0) {
    await jobRepository.updateById(job._id, updates);
  }

  if (job.providerId) {
    await enqueueNotification({
      userId: job.providerId.toString(),
      channel: "push",
      category: "JOB_UPDATE",
      subject: "Job Modified",
      body: `Your job has been modified. Changes: ${changes.join(", ")}`,
      immediate: true,
    });
  }

  return NextResponse.json({
    message: `Job updated successfully.${changes.length > 0 ? " Changes: " + changes.join(", ") : ""}${job.providerId ? " The provider has been notified." : ""}`,
    job: { id: String(job._id), status: job.status, scheduleDate: job.scheduleDate },
    changes,
    nextAction: "MODIFICATION_COMPLETE",
  });
});
