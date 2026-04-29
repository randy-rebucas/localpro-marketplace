import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { captureOrder, getOrder } from "@/lib/paypal";
import AgencyProfile from "@/models/AgencyProfile";
import { checkRateLimit, SENSITIVE_LIMITS } from "@/lib/rateLimit";

/**
 * POST /api/provider/agency/billing/confirm
 *
 * Called client-side after returning from PayPal checkout.
 * Captures the PayPal order and activates the agency subscription plan.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();
  await requireCsrfToken(req, user);
  const rl = await checkRateLimit(`agency:billing:confirm:${user.userId}`, SENSITIVE_LIMITS.payment);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json() as { orderId?: string };
  const { orderId } = body;
  if (!orderId) throw new ValidationError("orderId is required.");

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  if (agency.pendingPlanSessionId && orderId !== String(agency.pendingPlanSessionId)) {
    throw new ValidationError("Order ID does not match the pending checkout session.");
  }

  if (!agency.pendingPlanSessionId && !agency.pendingPlan) {
    return NextResponse.json({
      activated:     false,
      alreadyActive: true,
      plan:          agency.plan         ?? "starter",
      planStatus:    agency.planStatus   ?? "active",
      planExpiresAt: agency.planExpiresAt ?? null,
    });
  }

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

    if (!alreadyCaptured) {
      console.error("[AGENCY/BILLING/CONFIRM] PayPal capture failed:", msg);
      throw new ValidationError("Payment capture failed. Please try again or contact support.");
    }

    try {
      const order       = await getOrder(orderId);
      captureStatus     = order.status;
      captureMetadata   = order.metadata;
    } catch (innerErr) {
      console.error("[AGENCY/BILLING/CONFIRM] PayPal order lookup failed:", innerErr);
      throw new ValidationError("Could not verify payment status. Please contact support.");
    }
  }

  if (captureStatus !== "COMPLETED") {
    return NextResponse.json({ activated: false, alreadyActive: false, captureStatus });
  }

  const targetPlan =
    captureMetadata.plan ??
    (agency.pendingPlan ?? null);

  if (!targetPlan) throw new ValidationError("Could not determine target plan from PayPal order.");

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

  return NextResponse.json({
    activated:    true,
    plan:         targetPlan,
    planStatus:   "active",
    planExpiresAt: expires,
  });
});
