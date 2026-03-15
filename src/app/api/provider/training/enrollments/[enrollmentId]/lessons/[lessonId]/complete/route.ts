import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * POST /api/provider/training/enrollments/[enrollmentId]/lessons/[lessonId]/complete
 * Mark a single lesson as complete for an enrollment.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string; lessonId: string }> }
) => {
  const user = await requireUser();
  const { enrollmentId, lessonId } = await params;
  const result = await trainingService.completeLesson(user, enrollmentId, lessonId);
  return NextResponse.json(result);
});
