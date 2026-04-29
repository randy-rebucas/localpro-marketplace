import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { BASE_COMMISSION_RATE } from "@/lib/commission";
import AgencyProfile from "@/models/AgencyProfile";
import Transaction from "@/models/Transaction";
import Job from "@/models/Job";

/** GET /api/provider/agency/billing?months=<n> */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-billing:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const months = Math.min(24, Math.max(1, Number(searchParams.get("months") || "12")));

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();

  // No agency profile yet — return a zeroed default so the billing page still renders
  if (!agency) {
    return NextResponse.json({
      agencyName:          "",
      staffCount:          0,
      serviceCount:        0,
      plan:                "starter",
      planStatus:          "active",
      planActivatedAt:     null,
      planExpiresAt:       null,
      pendingPlan:         null,
      commissionRate:      BASE_COMMISSION_RATE,
      totalGrossEarned:    0,
      totalCommissionPaid: 0,
      totalNetEarned:      0,
      totalJobsCompleted:  0,
      thisMonthGross:      0,
      thisMonthCommission: 0,
      commissionHistory:   [],
    });
  }

  const ownerOid = new mongoose.Types.ObjectId(user.userId);
  const staffIds = [ownerOid, ...agency.staff.map((s) => s.userId)];

  const now    = new Date();
  const since  = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Lazy plan expiry — auto-mark past_due when the subscription window has passed
  let effectivePlanStatus = agency.planStatus ?? "active";
  if (
    agency.planExpiresAt &&
    agency.planExpiresAt < now &&
    effectivePlanStatus !== "past_due"
  ) {
    await AgencyProfile.updateOne({ _id: agency._id }, { $set: { planStatus: "past_due" } });
    effectivePlanStatus = "past_due";
  }

  const completedFilter = { payeeId: { $in: staffIds }, status: "completed" } as const;

  const [allTimeAgg, thisMonthAgg, trendAgg, jobsAgg] = await Promise.all([
    // All-time totals
    Transaction.aggregate([
      { $match: completedFilter },
      { $group: { _id: null, gross: { $sum: "$amount" }, commission: { $sum: "$commission" }, net: { $sum: "$netAmount" } } },
    ]),
    // This month totals
    Transaction.aggregate([
      { $match: { ...completedFilter, createdAt: { $gte: thisMonthStart } } },
      { $group: { _id: null, gross: { $sum: "$amount" }, commission: { $sum: "$commission" } } },
    ]),
    // Monthly breakdown for commission history table
    Transaction.aggregate([
      { $match: { ...completedFilter, createdAt: { $gte: since } } },
      {
        $group: {
          _id:        { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          gross:      { $sum: "$amount" },
          commission: { $sum: "$commission" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    // Total completed jobs
    Job.aggregate([
      { $match: { providerId: ownerOid, status: "completed" } },
      { $count: "total" },
    ]),
  ]);

  // Build commission history rows — fill missing months with zeroes
  const trendMap = new Map<string, { gross: number; commission: number }>();
  for (const r of trendAgg) {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
    trendMap.set(key, { gross: r.gross, commission: r.commission });
  }

  const commissionHistory: { month: string; gross: number; commission: number; net: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = trendMap.get(key) ?? { gross: 0, commission: 0 };
    commissionHistory.push({ month: key, gross: row.gross, commission: row.commission, net: row.gross - row.commission });
  }

  const commissionRate = allTimeAgg[0]?.gross > 0
    ? allTimeAgg[0].commission / allTimeAgg[0].gross
    : BASE_COMMISSION_RATE;

  return NextResponse.json({
    agencyName:         agency.name,
    staffCount:         agency.staff.length,
    serviceCount:       agency.services.length,
    // subscription fields
    plan:               agency.plan         ?? "starter",
    planStatus:         effectivePlanStatus,
    planActivatedAt:    agency.planActivatedAt ?? null,
    planExpiresAt:      agency.planExpiresAt   ?? null,
    pendingPlan:        agency.pendingPlan      ?? null,
    // financials
    commissionRate,
    totalGrossEarned:   allTimeAgg[0]?.gross      ?? 0,
    totalCommissionPaid:allTimeAgg[0]?.commission ?? 0,
    totalNetEarned:     allTimeAgg[0]?.net        ?? 0,
    totalJobsCompleted: jobsAgg[0]?.total         ?? 0,
    thisMonthGross:     thisMonthAgg[0]?.gross     ?? 0,
    thisMonthCommission:thisMonthAgg[0]?.commission ?? 0,
    commissionHistory,
  });
});
