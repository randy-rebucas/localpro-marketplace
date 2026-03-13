import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createOrder } from "@/lib/paypal";
import AgencyProfile from "@/models/AgencyProfile";

// Must match the prices shown in AgencyBillingClient.tsx PLANS array
const PLAN_PRICES: Record<string, number> = {
  growth:     999,
  pro:        2499,
  enterprise: 4999,
};

const PLAN_LABELS: Record<string, string> = {
  growth:     "LocalPro Agency Growth",
  pro:        "LocalPro Agency Pro",
  enterprise: "LocalPro Agency Enterprise",
};

/** POST /api/provider/agency/billing/checkout */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json() as { plan?: string };
  const { plan } = body;

  if (!plan || !["growth", "pro", "enterprise"].includes(plan)) {
    throw new ValidationError("plan must be one of: growth, pro, enterprise.");
  }

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  if ((agency.plan ?? "starter") === plan && (agency.planStatus ?? "active") === "active") {
    throw new ValidationError(`Your agency is already on the ${plan} plan.`);
  }

  // ── Dev / CI simulation — no PayPal credentials configured ────────────────
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    const now     = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await AgencyProfile.updateOne(
      { _id: agency._id },
      {
        $set: {
          plan:                 plan,
          planStatus:           "active",
          planActivatedAt:      now,
          planExpiresAt:        expires,
          pendingPlanSessionId: null,
          pendingPlan:          null,
        },
      }
    );

    console.log(`[AGENCY/BILLING] Dev simulation: plan "${plan}" activated for agency ${agency._id}`);

    return NextResponse.json({
      simulated:    true,
      plan,
      planStatus:   "active",
      planExpiresAt: expires,
    });
  }

  // ── Live PayPal checkout ──────────────────────────────────────────────────
  const amountPHP = PLAN_PRICES[plan];
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const order = await createOrder({
    amountPHP,
    description: `${PLAN_LABELS[plan]} — Monthly Subscription`,
    successUrl:  `${appUrl}/provider/business/billing?plan_success=1`,
    cancelUrl:   `${appUrl}/provider/business/billing?plan_cancelled=1`,
    metadata: {
      type:       "agency_subscription",
      agencyId:   String(agency._id),
      providerId: user.userId,
      plan,
    },
  });

  await AgencyProfile.updateOne(
    { _id: agency._id },
    { $set: { pendingPlanSessionId: order.id, pendingPlan: plan } }
  );

  return NextResponse.json({ checkoutUrl: order.approveUrl, orderId: order.id });
});
