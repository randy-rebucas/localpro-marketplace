import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/provider/training/[id]
 * Returns course detail. Lesson content only included if enrolled.
 */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await params;
  const course = await trainingService.getCourse(user, id);
  return NextResponse.json({ course });
});
