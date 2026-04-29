import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { startCronRun, finishCronRun } from "@/lib/cronRun";
import { userRepository } from "@/repositories/user.repository";
import { activityRepository } from "@/repositories/activity.repository";

/**
 * GET /api/cron/retention-cleanup
 *
 * Monthly data retention cleanup:
 *   1. Anonymises PII for soft-deleted users older than 90 days
 *   2. Purges ActivityLog entries older than 365 days
 *
 * Schedule: 0 2 1 * *  (02:00 on the 1st of every month)
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await startCronRun("/api/cron/retention-cleanup");
  const now        = new Date();
  const ninetyDays = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYear    = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  let usersAnonymised = 0;
  let activityLogsDeleted = 0;

  // ── 1. Anonymise PII for soft-deleted users older than 90 days ─────────────
  try {
    const toAnonymise = await userRepository.findPendingAnonymization(ninetyDays);
    for (const u of toAnonymise) {
      const suffix = u._id.toString().slice(-8);
      await userRepository.anonymizeById(u._id.toString(), suffix);
      usersAnonymised++;
    }
  } catch (err) {
    console.error("[RETENTION CRON] Error anonymising users:", err);
  }

  // ── 2. Purge ActivityLog entries older than 365 days ────────────────────────
  try {
    activityLogsDeleted = await activityRepository.pruneOld(oneYear);
  } catch (err) {
    console.error("[RETENTION CRON] Error purging ActivityLog:", err);
  }

  console.log(`[RETENTION CRON] usersAnonymised=${usersAnonymised} activityLogsDeleted=${activityLogsDeleted}`);

  await finishCronRun(run._id.toString(), {
    itemsProcessed: usersAnonymised + activityLogsDeleted,
    meta: { usersAnonymised, activityLogsDeleted },
  });

  return Response.json({
    ok: true,
    usersAnonymised,
    activityLogsDeleted,
    ranAt: now.toISOString(),
  });
}
