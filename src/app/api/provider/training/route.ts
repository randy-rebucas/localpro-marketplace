import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";
import type { TrainingCourseCategory } from "@/types";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/provider/training?category=basic
 * Returns all published courses with enrollment status for the requesting provider.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as TrainingCourseCategory | null;

  const courses = await trainingService.listPublished(user, category ?? undefined);
  return NextResponse.json({ courses });
});
