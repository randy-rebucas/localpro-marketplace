import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * GET /api/provider/training/enrollments
 * Returns all training enrollments for the requesting provider.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const enrollments = await trainingService.getMyEnrollments(user);
  return NextResponse.json({ enrollments });
});
