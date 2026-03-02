import { type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";

/**
 * GET /api/cron/dispute-overdue
 *
 * Automatically opens disputes for funded in_progress jobs that have passed
 * their scheduled date by 2+ days without the provider marking them complete.
 *
 * Runs daily via Vercel Cron (schedule: "0 1 * * *").
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const result = await cronService.autoDisputeOverdueJobs(2);
    console.log(`[cron/dispute-overdue] Auto-disputed ${result.disputed} overdue job(s).`);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/dispute-overdue] Fatal error:", err);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
