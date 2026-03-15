import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";
import type { TrainingCourseCategory } from "@/types";

/**
 * GET /api/provider/training?category=basic
 * Returns all published courses with enrollment status for the requesting provider.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as TrainingCourseCategory | null;

  const courses = await trainingService.listPublished(user, category ?? undefined);
  return NextResponse.json({ courses });
});
