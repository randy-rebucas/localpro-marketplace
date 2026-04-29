import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { hasAnalyticsAccess } from "@/lib/businessPlan";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import User from "@/models/User";

/** GET /api/provider/agency/analytics?months=<n> */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-analytics:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const months = Math.min(24, Math.max(1, Number(searchParams.get("months") || "6")));

  const agency = await AgencyProfile.findOne(
    { providerId: user.userId },
    "name staff plan"
  ).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  // Check if plan has analytics access
  if (!hasAnalyticsAccess(agency.plan)) {
    throw new ForbiddenError("Analytics is only available on Growth, Pro, and Enterprise plans. Please upgrade your plan.");
  }

  const ownerOid = new mongoose.Types.ObjectId(user.userId);

  // Jobs are assigned to the agency owner (ownerOid) only — not to individual staff.
  // Staff users are fetched by their IDs only for the staff roster section.
  const agencyStaffIds = agency.staff.map((s) => s.userId);

  // For review queries, include the owner + all staff members
  const staffOids = [
    ownerOid,
    ...agencyStaffIds.map((id) => new mongoose.Types.ObjectId(String(id))),
  ];

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [
    trendAgg,
    catAgg,
    clientJobsAgg,
    kpiJobsAgg,
    kpiRevenueAgg,
    kpiRatingAgg,
    peakHoursAgg,
    staffJobsAgg,
    staffRatingsAgg,
  ] = await Promise.all([
    // Revenue trend — agency owner only (status: "completed" = escrow released)
    Transaction.aggregate([
      { $match: { payeeId: ownerOid, status: "completed", createdAt: { $gte: since } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$netAmount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    // Jobs by category — agency owner only
    Job.aggregate([
      { $match: { providerId: ownerOid, status: "completed", updatedAt: { $gte: since } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    // Client retention — agency owner only
    Job.aggregate([
      { $match: { providerId: ownerOid, status: "completed", updatedAt: { $gte: since } } },
      { $group: { _id: "$clientId", bookings: { $sum: 1 } } },
    ]),
    // KPI: total completed jobs — agency owner only
    Job.aggregate([
      { $match: { providerId: ownerOid, status: "completed", updatedAt: { $gte: since } } },
      { $count: "total" },
    ]),
    // KPI: total revenue — agency owner only
    Transaction.aggregate([
      { $match: { payeeId: ownerOid, status: "completed", createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]),
    // KPI: avg rating + review count — all agency staff
    Review.aggregate([
      { $match: { providerId: { $in: staffOids } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    // Peak hours — agency owner only
    Job.aggregate([
      { $match: { providerId: ownerOid, status: "completed", createdAt: { $gte: since } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Per-staff completed jobs (staff members as individual providers)
    agencyStaffIds.length > 0
      ? Job.aggregate([
          { $match: { providerId: { $in: staffOids }, status: "completed", updatedAt: { $gte: since } } },
          { $group: { _id: "$providerId", jobs: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    // Per-staff avg rating
    agencyStaffIds.length > 0
      ? Review.aggregate([
          { $match: { providerId: { $in: staffOids } } },
          { $group: { _id: "$providerId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  // Revenue trend — fill missing months with 0
  const trendMap: Record<string, number> = {};
  for (const r of trendAgg) {
    trendMap[`${r._id.year}-${String(r._id.month).padStart(2, "0")}`] = r.revenue;
  }
  const revenueTrend: { month: string; revenue: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueTrend.push({ month: key, revenue: trendMap[key] ?? 0 });
  }

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const c of catAgg) {
    categoryBreakdown[String(c._id || "Uncategorized")] = c.count;
  }

  // Staff roster — only members registered to this agency
  // Jobs are assigned to the owner, so staff show their role + join date only
  const staffUserDocs = agencyStaffIds.length > 0
    ? await User.find({ _id: { $in: agencyStaffIds } }, "name avatar").lean()
    : [];

  // Build a role map from agency.staff
  const roleMap: Record<string, string> = {};
  for (const s of agency.staff) roleMap[String(s.userId)] = s.role;

  // Build per-staff lookup maps
  const staffJobMap  = new Map<string, number>(staffJobsAgg.map((r) => [String(r._id), r.jobs]));
  const staffRatingMap = new Map<string, { avg: number; count: number }>(
    staffRatingsAgg.map((r) => [String(r._id), { avg: r.avg as number, count: r.count as number }])
  );

  const staffPerformance = staffUserDocs.map((u) => {
    const uid    = String(u._id);
    const rating = staffRatingMap.get(uid);
    return {
      id:            uid,
      name:          u.name as string,
      avatar:        (u.avatar as string | null) ?? null,
      role:          roleMap[uid] ?? "worker",
      completedJobs: staffJobMap.get(uid) ?? 0,
      avgRating:     rating ? Math.round((rating.avg) * 10) / 10 : null,
      reviewCount:   rating?.count ?? 0,
    };
  });

  // Client retention
  const totalClients  = clientJobsAgg.length;
  const repeatClients = clientJobsAgg.filter((c) => c.bookings > 1).length;
  const clientRetentionRate = totalClients > 0
    ? Math.round((repeatClients / totalClients) * 100)
    : null;

  // KPIs
  const kpi = {
    totalJobs:    kpiJobsAgg[0]?.total    ?? 0,
    totalRevenue: kpiRevenueAgg[0]?.total ?? 0,
    avgRating:    kpiRatingAgg[0] ? Math.round((kpiRatingAgg[0].avg as number) * 10) / 10 : null,
    totalReviews: kpiRatingAgg[0]?.count  ?? 0,
  };

  // Peak hours from real job data
  const hourMap: Record<number, number> = {};
  for (const h of peakHoursAgg) hourMap[h._id as number] = h.count;

  function sumHours(from: number, to: number) {
    let n = 0;
    for (let h = from; h < to; h++) n += hourMap[h] ?? 0;
    return n;
  }

  const rawSlots = [
    { label: "Morning (6am–12pm)",   count: sumHours(6,  12) },
    { label: "Afternoon (12pm–6pm)", count: sumHours(12, 18) },
    { label: "Evening (6pm–10pm)",   count: sumHours(18, 22) },
    { label: "Night (10pm–6am)",     count: sumHours(22, 24) + sumHours(0, 6) },
  ];
  const peakTotal = rawSlots.reduce((s, p) => s + p.count, 0);
  const peakHours = rawSlots.map((p) => ({
    label:   p.label,
    count:   p.count,
    percent: peakTotal > 0 ? Math.round((p.count / peakTotal) * 100) : 0,
  }));

  return NextResponse.json({
    agencyName: agency.name,
    kpi,
    revenueTrend,
    categoryBreakdown,
    staffPerformance,
    clientRetentionRate,
    peakHours,
  });
});
