import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";

/**
 * Daily maintenance cron:
 *  1. Prune read notifications older than 60 days
 *  2. Prune activity logs older than 90 days
 *  3. Alert admins about jobs stuck in pending_validation > 48 hours
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const [notifications, activityLogs, pendingValidation] = await Promise.all([
    cronService.pruneOldNotifications(),
    cronService.pruneOldActivityLogs(),
    cronService.alertStalePendingValidation(),
  ]);

  return Response.json({
    ok: true,
    prunedNotifications: notifications.pruned,
    prunedActivityLogs: activityLogs.pruned,
    stalePendingValidationAlerted: pendingValidation.alerted,
  });
}
