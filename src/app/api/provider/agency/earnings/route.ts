import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import AgencyProfile from "@/models/AgencyProfile";
import Transaction from "@/models/Transaction";
import Payout from "@/models/Payout";

/** GET /api/provider/agency/earnings?months=<n> */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  await connectDB();

  const { searchParams } = new URL(req.url);
  const months = Math.min(24, Math.max(1, Number(searchParams.get("months") || "6")));

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const ownerOid = new mongoose.Types.ObjectId(user.userId);
  const staffIds = [ownerOid, ...agency.staff.map((s) => s.userId)];

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const since      = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const completedFilter = { payeeId: { $in: staffIds }, status: "completed" } as const;
  const pendingFilter   = { payeeId: { $in: staffIds }, status: "pending"   } as const;

  const [allTimeAgg, thisMonthAgg, trendAgg, pendingAgg, payoutsAgg, recentTxns] = await Promise.all([
    Transaction.aggregate([
      { $match: completedFilter },
      { $group: { _id: null, gross: { $sum: "$amount" }, net: { $sum: "$netAmount" }, commission: { $sum: "$commission" } } },
    ]),
    Transaction.aggregate([
      { $match: { ...completedFilter, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, gross: { $sum: "$amount" }, net: { $sum: "$netAmount" } } },
    ]),
    Transaction.aggregate([
      { $match: { ...completedFilter, createdAt: { $gte: since } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$netAmount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Transaction.aggregate([
      { $match: pendingFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payout.aggregate([
      { $match: { providerId: ownerOid, status: { $in: ["pending", "processing", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.find({ payeeId: { $in: staffIds } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("jobId", "title category")
      .lean(),
  ]);

  // Fill month gaps so the chart has a continuous x-axis
  const trendMap = new Map<string, number>();
  for (const r of trendAgg) {
    trendMap.set(`${r._id.year}-${String(r._id.month).padStart(2, "0")}`, r.revenue);
  }
  const trend: { month: string; revenue: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trend.push({ month: key, revenue: trendMap.get(key) ?? 0 });
  }

  const totalNet         = allTimeAgg[0]?.net   ?? 0;
  const alreadyPaidOut   = payoutsAgg[0]?.total ?? 0;
  const availableBalance = Math.max(0, totalNet - alreadyPaidOut);

  const transactions = recentTxns.map((t) => {
    const job = t.jobId as { title?: string; category?: string } | null;
    return {
      _id:        String(t._id),
      jobTitle:   job?.title    ?? "—",
      category:   job?.category ?? "—",
      gross:      t.amount,
      commission: t.commission,
      net:        t.netAmount,
      status:     t.status,
      date:       t.createdAt,
    };
  });

  return NextResponse.json({
    agencyName: agency.name,
    totals: {
      grossAllTime:     allTimeAgg[0]?.gross      ?? 0,
      netAllTime:       totalNet,
      commissionPaid:   allTimeAgg[0]?.commission ?? 0,
      thisMonthGross:   thisMonthAgg[0]?.gross    ?? 0,
      thisMonthNet:     thisMonthAgg[0]?.net      ?? 0,
      pendingPayouts:   pendingAgg[0]?.total      ?? 0,
      availableBalance,
    },
    trend,
    transactions,
  });
});
