import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * POST /api/provider/training/enrollments/[enrollmentId]/complete
 * Mark an entire course as completed and grant the badge.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) => {
  const user = await requireUser();
  const { enrollmentId } = await params;
  const result = await trainingService.completeCourse(user, enrollmentId);
  return NextResponse.json(result);
});
