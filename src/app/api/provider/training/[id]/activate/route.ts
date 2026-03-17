import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

/**
 * POST /api/provider/training/[id]/activate
 * Body: { sessionId: string }
 *
 * Called when the provider returns from PayMongo checkout.
 * Directly verifies the checkout session with PayMongo and activates enrollment
 * without waiting for the webhook — eliminates race conditions.
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json() as { sessionId?: string };

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const result = await trainingService.activateEnrollmentFromSession(user, id, body.sessionId);
  return NextResponse.json(result);
});
