/**
 * Outreach Generator Handler
 * Generates personalized engagement messages
 * POST /api/cron/generate-outreach
 *
 * Calls Outreach Agent to:
 * - Generate personalized re-engagement messages
 * - Determine optimal send time
 * - Select communication channel (email, push, SMS)
 * - Schedule delivery
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { withHandler } from "@/lib/utils";

// Vercel cron triggers GET — this route queries the DB for users who need
// re-engagement (jobs assigned but escrow unfunded for >24h) and generates
// outreach for each one via the outreach-agent.
export const GET = withHandler(async (req: NextRequest) => {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Outreach service not configured" }, { status: 503 });
  }

  // Allow manual override via query param (e.g. for testing a single user)
  const { searchParams } = new URL(req.url);
  const manualUserId   = searchParams.get("userId") ?? undefined;
  const actionType     = (searchParams.get("actionType") ?? "fund_escrow") as string;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ── Batch mode: find clients with unfunded assigned jobs (>24h) ────────────
  let targetUserIds: string[] = [];

  if (manualUserId) {
    targetUserIds = [manualUserId];
  } else {
    const { connectDB } = await import("@/lib/db");
    await connectDB();
    const { default: Job } = await import("@/models/Job");
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const jobs = await Job.find({
      status: "assigned",
      escrowStatus: "not_funded",
      updatedAt: { $lte: cutoff },
    })
      .select("clientId")
      .limit(50)
      .lean();

    // Deduplicate — one outreach per client regardless of how many jobs
    const seen = new Set<string>();
    for (const j of jobs) {
      const id = j.clientId?.toString();
      if (id && !seen.has(id)) { seen.add(id); targetUserIds.push(id); }
    }
  }

  if (targetUserIds.length === 0) {
    return NextResponse.json({ success: true, processed: 0, reason: "no_targets" });
  }

  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];

  for (const userId of targetUserIds) {
    try {
      const response = await fetch(`${appUrl}/api/ai/agents/outreach-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalKey}`,
        },
        body: JSON.stringify({
          userId,
          userProfile: { role: "client", engagementLevel: "medium" },
          actionType,
          context: {},
        }),
      });

      if (!response.ok) {
        console.error(`[Outreach Cron] Agent failed for ${userId}:`, response.status);
        results.push({ userId, ok: false, error: `agent_${response.status}` });
      } else {
        results.push({ userId, ok: true });
      }
    } catch (err) {
      console.error(`[Outreach Cron] Error for ${userId}:`, err);
      results.push({ userId, ok: false, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({ success: true, processed: targetUserIds.length, succeeded, results });
});
