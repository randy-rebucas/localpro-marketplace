import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletRepository } from "@/repositories/wallet.repository";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * GET /api/wallet/transactions
 *
 * Returns wallet transactions for the currently logged-in user with pagination.
 * Query params: page (default 1), limit (default 20, max 100)
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`wallet:txns:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

  const transactions = await walletRepository.listTransactions(user.userId, page, limit);

  return NextResponse.json({
    transactions: JSON.parse(JSON.stringify(transactions)),
    page,
    limit,
  });
});
