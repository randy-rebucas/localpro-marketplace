import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletService } from "@/services/wallet.service";
import { checkRateLimit } from "@/lib/rateLimit";

/** GET /api/wallet — returns balance, transaction history, and withdrawal requests */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const rl = await checkRateLimit(`wallet:get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const data = await walletService.getWallet(user.userId);
  return NextResponse.json(data);
});
