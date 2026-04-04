import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { payoutService } from "@/services/payout.service";
import { checkRateLimit } from "@/lib/rateLimit";

/** GET /api/payouts — list provider's payouts + available balance */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  const result = await payoutService.listProviderPayouts(user);
  return NextResponse.json(result);
});

/** POST /api/payouts — provider requests a payout */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  // Rate limit: 3 payout requests per hour per user.
  // failOpen: false — hard-fail if Redis is down (don't allow unlimited payouts).
  const rl = await checkRateLimit(
    `payout:${user.userId}`,
    { windowMs: 60 * 60 * 1000, max: 3 },
    { failOpen: false }
  );
  if (!rl.ok) {
    const retryMinutes = Math.ceil((rl.resetAt - Date.now()) / 60_000);
    return NextResponse.json(
      { error: `Too many payout requests. Try again in ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const payout = await payoutService.requestPayout(user, body);
  return NextResponse.json(payout, { status: 201 });
});
