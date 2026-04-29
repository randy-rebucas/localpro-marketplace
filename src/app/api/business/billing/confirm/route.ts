import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { captureOrder, getOrder } from "@/lib/paypal";
import { businessOrganizationRepository } from "@/repositories";
import type { BusinessPlan } from "@/types";

/**
 * POST /api/business/billing/confirm
 *
 * Called client-side after returning from PayPal checkout.
 * Captures the PayPal order and activates the subscription plan.
 *
 * Body: { orgId: string; orderId: string }
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-billing-confirm:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json() as { orgId?: string; orderId?: string };
  const { orgId, orderId } = body;

  if (!orgId)   throw new ValidationError("orgId is required.");
  if (!orderId) throw new ValidationError("orderId is required.");
  assertObjectId(orgId, "orgId");

  const org = await businessOrganizationRepository.findById(orgId);
  if (!org) throw new NotFoundError("Organization not found.");

  if (org.ownerId.toString() !== user.userId) throw new ForbiddenError();

  if (!org.pendingPlanSessionId && !org.pendingPlan) {
    return NextResponse.json({
      activated:     false,
      alreadyActive: true,
      plan:          (org.plan ?? "starter") as string,
      planStatus:    (org.planStatus ?? "active") as string,
      planExpiresAt: org.planExpiresAt ?? null,
    });
  }

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
    const alreadyCaptured =
      msg.includes("ORDER_ALREADY_CAPTURED") ||
      msg.includes("INSTRUMENT_DECLINED") ||
      msg.includes("already been captured");

    if (!alreadyCaptured) {
      throw new ValidationError("Payment capture failed. Please contact support if the issue persists.");
    }

    try {
      const order = await getOrder(orderId);
      captureStatus   = order.status;
      captureMetadata = order.metadata;
    } catch {
      throw new ValidationError("Could not verify payment status. Please contact support.");
    }
  }

  if (captureStatus !== "COMPLETED") {
    return NextResponse.json({ activated: false, alreadyActive: false, captureStatus });
  }

  const targetPlan =
    (captureMetadata.plan as BusinessPlan | undefined) ??
    (org.pendingPlan as BusinessPlan | null);

  if (!targetPlan) {
    throw new ValidationError("Could not determine target plan. Please contact support.");
  }

  const now     = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await businessOrganizationRepository.updateById(orgId, {
    $set: {
      plan:                 targetPlan,
      planStatus:           "active",
      planActivatedAt:      now,
      planExpiresAt:        expires,
      pendingPlanSessionId: null,
      pendingPlan:          null,
    },
  });

  console.log(
    `[BILLING/CONFIRM] Plan "${targetPlan}" activated for org ${orgId} ` +
    `via PayPal order ${orderId} (capture ${captureId})`
  );

  return NextResponse.json({
    activated:     true,
    plan:          targetPlan as string,
    planStatus:    "active" as string,
    planExpiresAt: expires,
  });
});
