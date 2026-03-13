import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { captureOrder, getOrder } from "@/lib/paypal";
import AgencyProfile from "@/models/AgencyProfile";

/**
 * POST /api/provider/agency/billing/confirm
 *
 * Called client-side after returning from PayPal checkout (`?plan_success=1&token=ORDER_ID`).
 * Captures the PayPal order and activates the agency subscription plan if payment succeeded.
 *
 * Body: { orderId: string }
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json() as { orderId?: string };
  const { orderId } = body;
  if (!orderId) throw new ValidationError("orderId is required.");

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  // Validate the returned PayPal order against what we stored at checkout initiation
  if (agency.pendingPlanSessionId && orderId !== String(agency.pendingPlanSessionId)) {
    throw new ValidationError("Order ID does not match the pending checkout session.");
  }

  // If already activated (no pending order), return current state
  if (!agency.pendingPlanSessionId && !agency.pendingPlan) {
    return NextResponse.json({
      activated:     false,
      alreadyActive: true,
      plan:          agency.plan         ?? "starter",
      planStatus:    agency.planStatus   ?? "active",
      planExpiresAt: agency.planExpiresAt ?? null,
    });
  }

  // Capture the PayPal order
  let captureStatus   = "";
  let captureMetadata: Record<string, string> = {};

  try {
    const result    = await captureOrder(orderId);
    captureStatus   = result.status;
    captureMetadata = result.metadata;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const alreadyCaptured =
      msg.includes("ORDER_ALREADY_CAPTURED") ||
      msg.includes("INSTRUMENT_DECLINED") ||
      msg.includes("already been captured");

    if (!alreadyCaptured) throw new Error(`PayPal capture failed: ${msg}`);

    try {
      const order       = await getOrder(orderId);
      captureStatus     = order.status;
      captureMetadata   = order.metadata;
    } catch (innerErr) {
      throw new Error(
        `PayPal order lookup failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
      );
    }
  }

  if (captureStatus !== "COMPLETED") {
    return NextResponse.json({ activated: false, alreadyActive: false, captureStatus });
  }

  // Determine target plan from metadata or pending field
  const targetPlan =
    captureMetadata.plan ??
    (agency.pendingPlan ?? null);

  if (!targetPlan) throw new Error("Could not determine target plan from PayPal order.");

  const now     = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await AgencyProfile.updateOne(
    { _id: agency._id },
    {
      $set: {
        plan:                 targetPlan,
        planStatus:           "active",
        planActivatedAt:      now,
        planExpiresAt:        expires,
        pendingPlanSessionId: null,
        pendingPlan:          null,
      },
    }
  );

  console.log(
    `[AGENCY/BILLING/CONFIRM] Plan "${targetPlan}" activated for agency ${agency._id} via PayPal order ${orderId}`
  );

  return NextResponse.json({
    activated:    true,
    plan:         targetPlan,
    planStatus:   "active",
    planExpiresAt: expires,
  });
});
