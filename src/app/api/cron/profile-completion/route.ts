import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";

/**
 * GET /api/cron/profile-completion
 *
 * Sends profile-completion nudge notifications (+ emails) to users who
 * registered 3+ days ago and still have an incomplete profile.
 * Throttled: each user receives at most one reminder per 7 days.
 *
 * Schedule: every Monday at 10:00 UTC  →  "0 10 * * 1"
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const result = await cronService.sendProfileCompletionReminders();
  return Response.json({ ok: true, ...result });
}
