import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { walletService } from "@/services/wallet.service";

const TopUpSchema = z.object({
  amount: z
    .number()
    .min(100, "Minimum top-up amount is ₱100")
    .max(100_000, "Maximum top-up amount is ₱100,000"),
});

/** POST /api/wallet/topup
 *
 * Creates a PayMongo checkout session for a wallet top-up.
 * Returns the checkout URL to redirect the client.
 * The wallet is credited via webhook (checkout_session.payment.paid with metadata.type === "wallet_topup").
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json().catch(() => ({}));
  const parsed = TopUpSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const origin =
    req.headers.get("origin") ??
    req.headers.get("x-forwarded-host") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

  const { checkoutUrl, sessionId } = await walletService.topUpWithGateway(
    user,
    parsed.data.amount,
    baseUrl
  );

  return NextResponse.json({ checkoutUrl, sessionId }, { status: 201 });
});
