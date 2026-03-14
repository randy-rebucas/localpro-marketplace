import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * POST /api/provider/training/[id]/enroll
 * Enroll in a course using the provider's platform wallet.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  const result = await trainingService.enrollFromWallet(user, id);
  return NextResponse.json(result, { status: 201 });
});
