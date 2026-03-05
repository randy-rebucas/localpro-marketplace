import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import { captureOrder, getOrder } from "@/lib/paypal";
import { businessOrganizationRepository } from "@/repositories";
import type { BusinessPlan } from "@/types";

/**
 * POST /api/business/billing/confirm
 *
 * Called client-side immediately after the user returns from PayPal checkout
 * (on `?plan_success=1&token=ORDER_ID`). Captures the PayPal order and activates
 * the subscription plan if payment succeeded.
 *
 * This makes plan activation instant on redirect — no dependency on webhook timing
 * and it works in local development.
 *
 * Body: { orgId: string; orderId: string }
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json() as { orgId?: string; orderId?: string };
  const { orgId, orderId } = body;

  if (!orgId)    throw new ValidationError("orgId is required.");
  if (!orderId)  throw new ValidationError("orderId is required.");

  const org = await businessOrganizationRepository.findById(orgId);
  if (!org) throw new NotFoundError("Organization not found.");

  // Only owner can confirm plan changes
  if (org.ownerId.toString() !== user.userId) throw new ForbiddenError();

  // If the org already has no pending order (already activated by a race), return early
  if (!org.pendingPlanSessionId && !org.pendingPlan) {
    return NextResponse.json({
      activated:     false,
      alreadyActive: true,
      plan:          (org.plan ?? "starter") as string,
      planStatus:    (org.planStatus ?? "active") as string,
      planExpiresAt: org.planExpiresAt ?? null,
    });
  }

  // Capture the PayPal order — this charges the buyer.
  // If the order was already captured (e.g. page refresh), fall back to reading status.
  let captureStatus  = "";
  let captureId: string | null = null;
  let captureMetadata: Record<string, string> = {};

  try {
    const result  = await captureOrder(orderId);
    captureStatus   = result.status;
    captureId       = result.captureId;
    captureMetadata = result.metadata;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // PayPal returns UNPROCESSABLE_ENTITY / ORDER_ALREADY_CAPTURED when re-capturing
    const alreadyCaptured =
      msg.includes("ORDER_ALREADY_CAPTURED") ||
      msg.includes("INSTRUMENT_DECLINED") ||
      msg.includes("already been captured");

    if (!alreadyCaptured) {
      throw new Error(`PayPal capture failed: ${msg}`);
    }

    // Fetch current order status to confirm payment did complete
    try {
      const order = await getOrder(orderId);
      captureStatus   = order.status;
      captureMetadata = order.metadata;
    } catch (innerErr) {
      throw new Error(
        `PayPal order lookup failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
      );
    }
  }

  // PayPal returns "COMPLETED" when all purchase units are captured successfully
  if (captureStatus !== "COMPLETED") {
    return NextResponse.json({
      activated: false,
      alreadyActive: false,
      captureStatus,
    });
  }

  // Resolve plan from metadata embedded in the PayPal order, or fall back to pendingPlan
  const targetPlan =
    (captureMetadata.plan as BusinessPlan | undefined) ??
    (org.pendingPlan as BusinessPlan | null);

  if (!targetPlan) {
    throw new Error("Could not determine target plan from PayPal order metadata.");
  }

  // Activate the plan
  const now     = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await businessOrganizationRepository.updateById(orgId, {
    $set: {
      plan:                targetPlan,
      planStatus:          "active",
      planActivatedAt:     now,
      planExpiresAt:       expires,
      pendingPlanSessionId: null,
      pendingPlan:         null,
    },
  });

  console.log(
    `[BILLING/CONFIRM] Plan "${targetPlan}" activated for org ${orgId} ` +
    `via PayPal order ${orderId} (capture ${captureId})`
  );

  return NextResponse.json({
    activated:    true,
    plan:         targetPlan as string,
    planStatus:   "active" as string,
    planExpiresAt: expires,
  });
});
