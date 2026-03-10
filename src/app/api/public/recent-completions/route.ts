/**
 * GET /api/public/recent-completions
 *
 * Returns up to 10 jobs completed within the last 24 hours, newest first.
 * Used by the CompletionToast on the public job board.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";

export const dynamic = "force-dynamic";

export async function GET() {
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
