import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * POST /api/provider/training/[id]/checkout
 * Initiate a PayMongo checkout session for course enrollment.
 * Returns { checkoutUrl } on success; caller should redirect the provider.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  const result = await trainingService.initiatePayMongoCheckout(user, id);
  return NextResponse.json(result, { status: 201 });
});
