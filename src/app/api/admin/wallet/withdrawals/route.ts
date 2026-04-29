import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletRepository } from "@/repositories/wallet.repository";

import { checkRateLimit } from "@/lib/rateLimit";
/** GET /api/admin/wallet/withdrawals (paginated) */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_payouts");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const result = await walletRepository.listAllWithdrawals(page, limit);
  return NextResponse.json(result);
});
