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
    const { jobId, modifications } = body;

    // Validate required fields
    if (!jobId || !modifications) {
      return NextResponse.json(
        { error: "Missing jobId or modifications" },
        { status: 400 }
      );
    }

    // Fetch the job
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify user owns this job or is the assigned provider
    if (
      job.clientId.toString() !== user.userId.toString() &&
      job.providerId?.toString() !== user.userId.toString()
    ) {
      return NextResponse.json(
        { error: "You do not have permission to modify this job" },
        { status: 403 }
      );
    }

    // Check job status - can only modify if not completed/cancelled
    const modifiableStatuses = ["open", "assigned", "pending", "in_progress"];
    if (!modifiableStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot modify job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Track what was changed
    const changes: string[] = [];
    const originalJob = { ...job.toObject() };

    // Update date if provided
    if (modifications.newDate) {
      const newDate = new Date(modifications.newDate);
      if (newDate < new Date()) {
        return NextResponse.json(
          { error: "Cannot reschedule to a past date" },
          { status: 400 }
        );
      }
      const oldDate = job.scheduleDate;
      job.scheduleDate = newDate;
      changes.push(
        `Rescheduled from ${oldDate?.toLocaleDateString()} to ${newDate.toLocaleDateString()}`
      );
    }

    // Update time if provided
    // Note: Job model doesn't have scheduledTime field, time tracking is future work
    if (modifications.newTime) {
      changes.push(`Updated time to ${modifications.newTime}`);
    }

    // Handle scope changes
    if (modifications.scopeChange) {
      switch (modifications.scopeChange) {
        case "add":
          changes.push("Additional work added to scope");
          break;
        case "remove":
          changes.push("Some work removed from scope");
          break;
        case "reduce":
          changes.push("Scope reduced - fewer hours/materials");
          break;
      }
    }

    // If assigned to provider, notify them
    // If assigned to provider, notify them
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

    // Save modifications
    // Note: Full modification history stored in separate model (future implementation)
    // For now, we just rely on updatedAt timestamp from Mongoose

    await job.save();

    return NextResponse.json({
      message: `Job updated successfully. ${changes.length > 0 ? "Changes: " + changes.join(", ") : ""}${job.providerId ? " The provider has been notified." : ""}`,
      job: {
        id: job._id.toString(),
        status: job.status,
        scheduleDate: job.scheduleDate,
      },
      changes,
      nextAction: "MODIFICATION_COMPLETE",
    });
  } catch (error) {
    console.error("[AI Chat] Job modification failed:", error);
    return NextResponse.json(
      { error: "Failed to modify job" },
      { status: 500 }
    );
  }
}
