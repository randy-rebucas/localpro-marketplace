/**
 * GET /api/public/jobs/:id
 *
 * Fully public endpoint — no authentication required.
 * Returns non-sensitive job fields for the public job detail page.
 */

import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { assertObjectId, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobRepository } from "@/repositories";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const rl = await checkRateLimit(`pub-job:${clientIp(req)}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "jobId");

  const job = await jobRepository.getDocById(id);
  if (!job) throw new NotFoundError("Job");

  const j = job as unknown as Record<string, unknown>;
  return NextResponse.json({
    _id:                 j._id,
    title:               j.title,
    category:            j.category,
    location:            j.location,
    budget:              j.budget,
    scheduleDate:        j.scheduleDate,
    description:         j.description,
    specialInstructions: j.specialInstructions,
    status:              j.status,
    milestones:          j.milestones,
    createdAt:           j.createdAt,
  });
});
