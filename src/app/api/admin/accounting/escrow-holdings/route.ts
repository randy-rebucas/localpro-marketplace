import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";

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

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const currency = searchParams.get("currency") ?? "PHP";
  const skip     = (page - 1) * limit;

  const filter = { status: "pending", currency };

  const [rows, total, aggregate] = await Promise.all([
    Transaction.find(filter)
      .populate("jobId",   "title category location scheduleDate")
      .populate("payerId", "name email")
      .populate("payeeId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: filter },
      { $group: {
        _id:             null,
        totalAmount:     { $sum: "$amount"     },
        totalCommission: { $sum: "$commission"  },
        totalNetAmount:  { $sum: "$netAmount"   },
        count:           { $sum: 1             },
      }},
    ]),
  ]);

  const totals = aggregate[0] ?? { totalAmount: 0, totalCommission: 0, totalNetAmount: 0, count: 0 };

  return NextResponse.json({
    currency,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    totals: {
      amountPHP:     totals.totalAmount,
      commissionPHP: totals.totalCommission,
      netAmountPHP:  totals.totalNetAmount,
      count:         totals.count,
    },
    holdings: rows,
  });
});
