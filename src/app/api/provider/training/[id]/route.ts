import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * GET /api/provider/training/[id]
 * Returns course detail. Lesson content only included if enrolled.
 */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  const course = await trainingService.getCourse(user, id);
  return NextResponse.json({ course });
});
