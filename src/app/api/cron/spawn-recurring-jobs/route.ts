import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { recurringJobSpawnerService } from "@/services/recurring-job-spawner.service";

/**
 * GET /api/cron/spawn-recurring-jobs
 *
 * Spawns recurring jobs based on scheduled dates:
 * - Checks all active recurring schedules
 * - Spawns jobs for those due to run
 * - Auto-assigns to preferred provider if locked
 * - Advances schedule to next run date
 * - Notifies client of new job
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recurringJobSpawnerService.executeBulkSpawning();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[spawn-recurring-jobs] Cron error:", error);
    return NextResponse.json({ error: "Recurring job spawning failed" }, { status: 500 });
  }
}
