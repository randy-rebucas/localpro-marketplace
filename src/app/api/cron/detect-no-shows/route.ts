import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { jobRepository } from "@/repositories/job.repository";
import { activityRepository } from "@/repositories/activity.repository";
import { geoVerificationService } from "@/services/geo-verification.service";
import { providerReplacementService } from "@/services/provider-replacement.service";

const SYSTEM_USER_ID = "000000000000000000000000";

/**
 * GET /api/cron/detect-no-shows
 *
 * Detects provider no-shows (30+ minutes past scheduled time with no valid check-in),
 * auto-escalates and triggers provider replacement, notifies client and admin.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeJobs = await jobRepository.find({
      status: { $in: ["assigned", "in_progress"] },
      scheduleDate: { $exists: true, $ne: null },
    });

    const noShowEvents: Array<{
      jobId: string;
      providerId: string;
      minutesLate: number;
    }> = [];

    for (const job of activeJobs) {
      const noShowEvent = await geoVerificationService.processNoShow(job._id!.toString());
      if (noShowEvent) {
        noShowEvents.push(noShowEvent);

        try {
          const replacementResult = await providerReplacementService.replaceProvider({
            jobId: job._id!.toString(),
            currentProviderId: job.providerId?.toString() || "",
            reason: "no_show",
            attemptNumber: 1,
          });
          console.log(`[detect-no-shows] Replacement result for job ${job._id}:`, replacementResult);
        } catch (err) {
          console.error(`[detect-no-shows] Error replacing provider for job ${job._id}:`, err);
        }
      }
    }

    await activityRepository.log({
      userId: SYSTEM_USER_ID,
      eventType: "admin_ledger_entry",
      metadata: {
        action: "no_show_detection",
        jobsChecked: activeJobs.length,
        noShowsFound: noShowEvents.length,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      jobsChecked: activeJobs.length,
      noShowsDetected: noShowEvents.length,
      noShows: noShowEvents,
    });
  } catch (error) {
    console.error("[detect-no-shows] Cron error:", error);
    return NextResponse.json({ error: "No-show detection failed" }, { status: 500 });
  }
}
