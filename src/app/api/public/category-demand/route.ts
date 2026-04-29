/**
 * GET /api/public/category-demand
 *
 * Fully public, no auth required.
 * Returns top categories by open job count for the demand bar widget.
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
  const rl = await checkRateLimit(`pub-cat-demand:${clientIp(req)}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json([], { status: 429 });

  try {
    await connectDB();

    const results = await Job.aggregate([
      { $match: { status: "open" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    return NextResponse.json(
      results.map((r) => ({ category: r._id as string, count: r.count as number }))
    );
  } catch (err) {
    console.error("[/api/public/category-demand]", err);
    return NextResponse.json([], { status: 200 });
  }
}
