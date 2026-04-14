import { NextResponse } from "next/server";
import { jobRepository } from "@/repositories/job.repository";
import { geoVerificationService } from "@/services/geo-verification.service";
import { providerReplacementService } from "@/services/provider-replacement.service";
import { activityRepository } from "@/repositories/activity.repository";

/**
 * GET /api/cron/detect-no-shows
 *
 * Cron job to detect provider no-shows (30+ minutes past scheduled time with no valid check-in)
 * Triggered periodically to:
 * - Find jobs that exceeded no-show threshold
 * - Auto-escalate and trigger provider replacement
 * - Notify client and admin
 *
 * Security: Requires CRON_SECRET header
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret to prevent unauthorized triggers
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all jobs that are currently assigned or in_progress
    const activeJobs = await jobRepository.find({
      status: { $in: ["assigned", "in_progress"] },
      scheduleDate: { $exists: true, $ne: null },
    });

    const noShowEvents: Array<{
      jobId: string;
      providerId: string;
      minutesLate: number;
    }> = [];

    // Check each job for no-shows
    for (const job of activeJobs) {
      const noShowEvent = await geoVerificationService.processNoShow(job._id!.toString());
      if (noShowEvent) {
        noShowEvents.push(noShowEvent);

        // Trigger provider replacement
        try {
          const replacementResult = await providerReplacementService.replaceProvider({
            jobId: job._id!.toString(),
            currentProviderId: job.providerId?.toString() || "",
            reason: "no_show",
            attemptNumber: 1,
          });

          console.log(
            `[detect-no-shows] Replacement result for job ${job._id}:`,
            replacementResult
          );
        } catch (err) {
          console.error(
            `[detect-no-shows] Error replacing provider for job ${job._id}:`,
            err
          );
        }
      }
    }

    // Log cron execution
    await activityRepository.log({
      userId: null as any,
      eventType: "admin_ledger_entry",
      metadata: {
        action: "no_show_detection",
        jobsChecked: activeJobs.length,
        noShowsFound: noShowEvents.length,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        jobsChecked: activeJobs.length,
        noShowsDetected: noShowEvents.length,
        noShows: noShowEvents,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[detect-no-shows] Cron error:", error);

    return NextResponse.json(
      {
        error: "No-show detection failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
