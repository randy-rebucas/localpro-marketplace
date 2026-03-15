import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import { createOrder } from "@/lib/paypal";
import { businessOrganizationRepository } from "@/repositories";
import type { BusinessPlan } from "@/types";

const PLAN_PRICES: Record<string, number> = {
  growth:     999,
  pro:        2499,
  enterprise: 4999,
};

const PLAN_LABELS: Record<string, string> = {
  growth:     "LocalPro Business Growth",
  pro:        "LocalPro Business Pro",
  enterprise: "LocalPro Business Enterprise",
};

/** POST /api/business/billing/checkout — create a PayPal order for a plan upgrade */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json() as { orgId?: string; plan?: string };
  const { orgId, plan } = body;

  if (!orgId) throw new ValidationError("orgId is required.");
  if (!plan || !["growth", "pro", "enterprise"].includes(plan)) {
    throw new ValidationError("plan must be one of: growth, pro, enterprise.");
  }

  const org = await businessOrganizationRepository.findById(orgId);
  if (!org) throw new NotFoundError("Organization not found.");

  // Only owner can change the plan
  if (org.ownerId.toString() !== user.userId) throw new ForbiddenError();

  // Already on this plan
  if (org.plan === plan && org.planStatus === "active") {
    throw new ValidationError(`Your organization is already on the ${plan} plan.`);
  }

  const amountPHP = PLAN_PRICES[plan];
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const order = await createOrder({
    amountPHP,
    description: `${PLAN_LABELS[plan]} — Monthly Subscription`,
    successUrl:  `${appUrl}/api/payment-return?to=${encodeURIComponent("/client/business/billing?plan_success=1")}`,
    cancelUrl:   `${appUrl}/client/business/billing?plan_cancelled=1`,
    metadata: {
      type:   "subscription",
      orgId,
      plan,
      userId: user.userId,
    },
  });

  // Store the pending PayPal order ID on the org so confirm can resolve it
  await businessOrganizationRepository.updateById(orgId, {
    $set: {
      pendingPlanSessionId: order.id,
      pendingPlan:          plan as BusinessPlan,
    },
  });

  return NextResponse.json({ checkoutUrl: order.approveUrl, orderId: order.id });
});
