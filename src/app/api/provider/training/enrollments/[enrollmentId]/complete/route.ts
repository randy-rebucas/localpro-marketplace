import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * POST /api/provider/training/enrollments/[enrollmentId]/complete
 * Mark an entire course as completed and grant the badge.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { enrollmentId } = await params;
  const result = await trainingService.completeCourse(user, enrollmentId);
  return NextResponse.json(result);
});
