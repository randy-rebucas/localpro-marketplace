/**
 * GET /api/public/recent-completions
 *
 * Returns up to 10 jobs completed within the last 24 hours, newest first.
 * Used by the CompletionToast on the public job board.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import Job from "@/models/Job";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`pub-completions:${clientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json([], { status: 429 });

  try {
    await connectDB();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const completions = await Job.find({
      status: "completed",
      updatedAt: { $gte: since },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("_id title category location budget")
      .lean();

    return NextResponse.json(
      completions.map((j) => ({
        _id:      j._id?.toString(),
        title:    j.title,
        category: j.category,
        location: j.location,
        budget:   j.budget,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
