import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Payout from "@/models/Payout";

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

  await connectDB();

  const currency = new URL(req.url).searchParams.get("currency") ?? "PHP";

  const [earnedRows, payoutRows] = await Promise.all([
    // Group completed transaction nets by provider
    Transaction.aggregate([
      { $match: { status: "completed", currency } },
      { $group: {
        _id:           "$payeeId",
        earned:        { $sum: "$netAmount" },
        jobCount:      { $sum: 1 },
      }},
    ]),
    // Group all non-rejected payouts per provider (pending+processing+completed)
    Payout.aggregate([
      { $match: { status: { $in: ["pending", "processing", "completed"] } } },
      { $group: {
        _id:     "$providerId",
        paidOut: { $sum: "$amount" },
      }},
    ]),
  ]);

  // Build a map of paidOut per provider
  const payoutMap = new Map<string, number>(
    payoutRows.map((r) => [String(r._id), r.paidOut as number])
  );

  // Populate provider names/emails
  const providerIds = earnedRows.map((r) => r._id);
  const { default: User } = await import("@/models/User");
  const providers = await User.find(
    { _id: { $in: providerIds } },
    "name email"
  ).lean();
  const providerMap = new Map(providers.map((p) => [String((p as { _id: unknown })._id), p]));

  let totalOwed = 0;
  const rows = earnedRows.map((r) => {
    const id      = String(r._id);
    const earned  = r.earned  as number;
    const paidOut = payoutMap.get(id) ?? 0;
    const owed    = earned - paidOut;
    totalOwed += owed;
    const p = providerMap.get(id) as { name?: string; email?: string } | undefined;
    return {
      providerId: id,
      name:       p?.name ?? "Unknown",
      email:      p?.email ?? "",
      earned,
      paidOut,
      owed,
      jobCount:   r.jobCount as number,
    };
  });

  // Sort by most owed first
  rows.sort((a, b) => b.owed - a.owed);

  return NextResponse.json({
    currency,
    totalOwedPHP:     totalOwed,
    providerCount:    rows.length,
    providers:        rows,
  });
});
