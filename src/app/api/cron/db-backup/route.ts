import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { triggerAtlasSnapshot } from "@/services/backup.service";

/**
 * GET /api/cron/db-backup
 *
 * Daily cron: trigger a MongoDB Atlas cloud backup snapshot.
 * Scheduled: 0 1 * * * (1 AM UTC — offset from other maintenance crons)
 *
 * Requires MONGODB_ATLAS_PUBLIC_KEY, MONGODB_ATLAS_PRIVATE_KEY,
 * MONGODB_ATLAS_PROJECT_ID, MONGODB_ATLAS_CLUSTER_NAME to be set.
 * If Atlas is not configured, returns a 200 with a warning so
 * the cron doesn't fail health checks on environments without Atlas creds.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const atlasConfigured =
    !!process.env.MONGODB_ATLAS_PUBLIC_KEY &&
    !!process.env.MONGODB_ATLAS_PRIVATE_KEY &&
    !!process.env.MONGODB_ATLAS_PROJECT_ID &&
    !!process.env.MONGODB_ATLAS_CLUSTER_NAME;

  if (!atlasConfigured) {
    console.warn("[CRON/db-backup] Atlas credentials not configured — skipping snapshot.");
    return Response.json({
      ok: true,
      skipped: true,
      reason: "Atlas credentials not configured",
    });
  }

  await connectDB();

  try {
    const { snapshotId, logId } = await triggerAtlasSnapshot(
      "cron",
      undefined,
      "Daily automated backup snapshot"
    );

    console.info(`[CRON/db-backup] Snapshot queued: ${snapshotId} (log: ${logId})`);

    return Response.json({ ok: true, snapshotId, logId });
  } catch (err) {
    console.error("[CRON/db-backup] Snapshot failed:", (err as Error).message);
    return Response.json({ ok: false, error: "Snapshot request failed" }, { status: 500 });
  }
}
