import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { transactionRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/admin/accounting/escrow-holdings?page=1&limit=50&currency=PHP
 *
 * Returns all escrow transactions that are currently in-flight (status = "pending").
 * These represent client money the platform is holding in trust.
 *
 * Sum of all rows = Account 2000 (Escrow Payable) balance.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const currency = searchParams.get("currency") ?? "PHP";

  const { rows, total, aggregate } = await transactionRepository.findEscrowHoldings(
    currency,
    page,
    limit
  );

  return NextResponse.json({
    currency,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    totals: {
      amountPHP:     aggregate.totalAmount,
      commissionPHP: aggregate.totalCommission,
      netAmountPHP:  aggregate.totalNetAmount,
      count:         aggregate.count,
    },
    holdings: rows,
  });
});
