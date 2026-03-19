import { type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";

/**
 * GET /api/cron/dispute-overdue
 *
 * 1. Automatically opens disputes for funded in_progress jobs that have passed
 *    their scheduled date by 2+ days without the provider marking them complete.
 * 2. Auto-escalates open disputes to "investigating" after 48 hours without action.
 *
 * Runs daily via Vercel Cron (schedule: "0 1 * * *").
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const [disputeResult, escalationResult] = await Promise.all([
      cronService.autoDisputeOverdueJobs(2),
      cronService.autoEscalateStaleDisputes(48),
    ]);

    console.log(
      `[cron/dispute-overdue] Auto-disputed ${disputeResult.disputed} overdue job(s), ` +
      `auto-escalated ${escalationResult.escalated} stale dispute(s).`
    );

    return Response.json({
      ok: true,
      disputed: disputeResult.disputed,
      escalated: escalationResult.escalated,
    });
  } catch (err) {
    console.error("[cron/dispute-overdue] Fatal error:", err);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
