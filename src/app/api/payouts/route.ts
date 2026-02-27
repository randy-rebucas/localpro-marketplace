import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { payoutService } from "@/services/payout.service";

/** GET /api/payouts — list provider's payouts + available balance */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  const result = await payoutService.listProviderPayouts(user);
  return NextResponse.json(result);
});

/** POST /api/payouts — provider requests a payout */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const payout = await payoutService.requestPayout(user, body);
  return NextResponse.json(payout, { status: 201 });
});
