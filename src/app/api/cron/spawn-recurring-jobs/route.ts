import { NextResponse } from "next/server";
import { recurringJobSpawnerService } from "@/services/recurring-job-spawner.service";
import { activityRepository } from "@/repositories/activity.repository";

/**
 * GET /api/cron/spawn-recurring-jobs
 *
 * Cron job to spawn recurring jobs based on scheduled dates
 * Triggered once per day (or more frequently) to:
 * - Check all active recurring schedules
 * - Spawn jobs for those due to run
 * - Auto-assign to preferred provider if locked
 * - Advance schedule to next run date
 * - Notify client of new job
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

    // Execute bulk spawning of all due recurring schedules
    const result = await recurringJobSpawnerService.executeBulkSpawning();

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[spawn-recurring-jobs] Cron error:", error);

    return NextResponse.json(
      {
        error: "Recurring job spawning failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
