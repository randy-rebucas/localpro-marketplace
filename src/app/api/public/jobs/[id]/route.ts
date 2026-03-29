/**
 * GET /api/public/jobs/:id
 *
 * Fully public endpoint — no authentication required.
 * Returns non-sensitive job fields for the public job detail page.
 */

import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { assertObjectId, NotFoundError } from "@/lib/errors";
import { jobRepository } from "@/repositories";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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
