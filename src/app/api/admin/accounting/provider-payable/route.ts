import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { transactionRepository, payoutRepository, userRepository } from "@/repositories";

/**
 * GET /api/admin/accounting/provider-payable?currency=PHP
 *
 * Returns a per-provider breakdown of:
 *   earned     = SUM(Transaction.netAmount WHERE status="completed")
 *   paidOut    = SUM(Payout.amount WHERE status IN ["pending","processing","completed"])
 *   owed       = earned - paidOut
 *
 * Sum of `owed` across all providers = Account 2100 (Earnings Payable) balance.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const currency = new URL(req.url).searchParams.get("currency") ?? "PHP";

  const [earnedRows, payoutRows] = await Promise.all([
    transactionRepository.aggregateEarnedByProvider(currency),
    payoutRepository.aggregatePaidOutByProvider(),
  ]);

  // Build a map of paidOut per provider
  const payoutMap = new Map<string, number>(
    payoutRows.map((r) => [String(r._id), r.paidOut as number])
  );

  // Populate provider names/emails via repository
  const providerIds = earnedRows.map((r) => String(r._id));
  const providers = await userRepository.findByIds(providerIds);
  const providerMap = new Map(providers.map((p) => [String(p._id), p]));

  let totalOwed = 0;
  const rows = earnedRows.map((r) => {
    const id      = String(r._id);
    const earned  = r.earned  as number;
    const paidOut = payoutMap.get(id) ?? 0;
    const owed    = earned - paidOut;
    totalOwed += owed;
    const p = providerMap.get(id);
    return {
      providerId: id,
      name:       p?.name  ?? "Unknown",
      email:      p?.email ?? "",
      earned,
      paidOut,
      owed,
      jobCount: r.jobCount as number,
    };
  });

  // Sort by most owed first
  rows.sort((a, b) => b.owed - a.owed);

  return NextResponse.json({
    currency,
    totalOwedPHP:  totalOwed,
    providerCount: rows.length,
    providers:     rows,
  });
});
