import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { startCronRun, finishCronRun, failCronRun } from "@/lib/cronRun";

/**
 * GET /api/cron/retention-cleanup
 *
 * Monthly data retention cleanup:
 *   1. Hard-deletes soft-deleted users whose deletedAt is > 90 days ago
 *      (anonymises PII rather than full hard-delete to preserve audit trail)
 *   2. Purges ActivityLog entries older than 365 days to control DB growth
 *
 * Schedule: 0 2 1 * *  (02:00 on the 1st of every month)
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const run = await startCronRun("/api/cron/retention-cleanup");
  const now         = new Date();
  const ninetyDays  = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYear     = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  let usersAnonymised = 0;
  let activityLogsDeleted = 0;

  // ── 1. Anonymise PII for soft-deleted users older than 90 days ─────────────
  try {
    const toAnonymise = await User.find({
      isDeleted: true,
      deletedAt: { $lt: ninetyDays },
      // Don't re-anonymise users whose email already looks anonymised
      email: { $not: /^deleted-/ },
    }).select("_id").lean();

    for (const u of toAnonymise) {
      const anonymisedSuffix = String(u._id).slice(-8);
      await User.updateOne(
        { _id: u._id },
        {
          $set: {
            name:           `Deleted User`,
            email:          `deleted-${anonymisedSuffix}@localpro.invalid`,
            phone:          null,
            avatar:         null,
            password:       null,
            addresses:      [],
            verificationToken:         null,
            verificationTokenExpiry:   null,
            resetPasswordToken:        null,
            resetPasswordTokenExpiry:  null,
            otpCode:        null,
            otpExpiry:      null,
            pushSubscriptions: [],
          },
        }
      );
      usersAnonymised++;
    }
  } catch (err) {
    console.error("[RETENTION CRON] Error anonymising users:", err);
  }

  // ── 2. Purge ActivityLog entries older than 365 days ────────────────────────
  try {
    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: oneYear },
    });
    activityLogsDeleted = result.deletedCount ?? 0;
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
