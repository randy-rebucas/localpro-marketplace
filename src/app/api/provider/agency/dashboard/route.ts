import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import User from "@/models/User";

/** GET /api/provider/agency/dashboard */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-dashboard:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  void req;

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build ObjectId array for all staff + owner
  const ownerOid = new mongoose.Types.ObjectId(user.userId);
  const staffIds = [ownerOid, ...agency.staff.map((s) => s.userId)];

  // Active and in-progress job counts
  const [activeJobs, inProgressCount, completedThisMonth] = await Promise.all([
    Job.countDocuments({ providerId: { $in: staffIds }, status: { $in: ["open", "assigned", "in_progress"] } }),
    Job.countDocuments({ providerId: { $in: staffIds }, status: "in_progress" }),
    Job.countDocuments({ providerId: { $in: staffIds }, status: "completed", updatedAt: { $gte: monthStart } }),
  ]);

  // Monthly revenue (net after commission)
  const revenueAgg = await Transaction.aggregate([
    { $match: { payeeId: { $in: staffIds }, type: "escrow_release", createdAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: "$netAmount" } } },
  ]);
  const monthlyRevenue = revenueAgg[0]?.total ?? 0;

  // Pending payouts
  const payoutAgg = await Transaction.aggregate([
    { $match: { payeeId: { $in: staffIds }, type: "escrow_release", payoutStatus: { $in: ["pending", null] } } },
    { $group: { _id: null, total: { $sum: "$netAmount" } } },
  ]);
  const pendingPayouts = payoutAgg[0]?.total ?? 0;

  // Avg rating
  const ratingAgg = await Review.aggregate([
    { $match: { providerId: { $in: staffIds } } },
    { $group: { _id: null, avg: { $avg: "$rating" } } },
  ]);
  const avgRating = ratingAgg[0]?.avg ?? 0;

  // Completion rate
  const [totalJobs, doneJobs] = await Promise.all([
    Job.countDocuments({ providerId: { $in: staffIds }, status: { $nin: ["open", "cancelled"] } }),
    Job.countDocuments({ providerId: { $in: staffIds }, status: "completed" }),
  ]);
  const completionRate = totalJobs > 0 ? Math.round((doneJobs / totalJobs) * 100) : 0;

  // 6-month revenue trend
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendAgg = await Transaction.aggregate([
    { $match: { payeeId: { $in: staffIds }, type: "escrow_release", createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$netAmount" } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  const revenueTrend = trendAgg.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    revenue: r.revenue,
  }));

  // Jobs by category (completed)
  const catAgg = await Job.aggregate([
    { $match: { providerId: { $in: staffIds }, status: "completed" } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  const jobsByCategory: Record<string, number> = {};
  for (const c of catAgg) jobsByCategory[String(c._id)] = c.count;

  // Top staff by completed jobs
  const staffCompletions = await Job.aggregate([
    { $match: { providerId: { $in: staffIds }, status: "completed" } },
    { $group: { _id: "$providerId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const topStaffIds = staffCompletions.map((s) => s._id);
  const [staffUsers, staffReviews] = await Promise.all([
    User.find({ _id: { $in: topStaffIds } }, "name avatar").lean(),
    Review.aggregate([
      { $match: { providerId: { $in: topStaffIds } } },
      { $group: { _id: "$providerId", avg: { $avg: "$rating" } } },
    ]),
  ]);
  const ratingMap: Record<string, number> = {};
  for (const r of staffReviews) ratingMap[String(r._id)] = r.avg;

  const topStaff = staffUsers.map((u) => {
    const comp = staffCompletions.find((s) => String(s._id) === String(u._id));
    return {
      id: String(u._id),
      name: u.name as string,
      avatar: (u.avatar as string | null) ?? null,
      completedJobs: comp?.count ?? 0,
      rating: Math.round((ratingMap[String(u._id)] ?? 0) * 10) / 10,
    };
  });

  return NextResponse.json({
    kpi: {
      activeJobs,
      inProgress: inProgressCount,
      completedThisMonth,
      staffCount: agency.staff.length + 1,
      monthlyRevenue,
      avgRating: Math.round(avgRating * 10) / 10,
      completionRate,
      pendingPayouts,
    },
    revenueTrend,
    jobsByCategory,
    topStaff,
    serviceAreas: agency.serviceAreas,
  });
});
