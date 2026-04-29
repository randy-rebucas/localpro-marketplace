import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
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

  const rl = await checkRateLimit(`training-activate:${user.userId}`, { windowMs: 3_600_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "trainingId");

  const body = await req.json().catch(() => ({})) as { sessionId?: string };

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const result = await trainingService.activateEnrollmentFromSession(user, id, body.sessionId);
  return NextResponse.json(result);
});
