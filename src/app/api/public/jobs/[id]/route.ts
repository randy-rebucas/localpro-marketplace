/**
 * GET /api/public/jobs/:id
 *
 * Fully public endpoint — no authentication required.
 * Returns non-sensitive job fields for the public job detail page.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectDB();

    const job = await Job.findById(id)
      .select(
        "_id title category location budget scheduleDate description specialInstructions status milestones createdAt"
      )
      .lean();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
