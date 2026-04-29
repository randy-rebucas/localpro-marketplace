import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";
import Review from "@/models/Review";

export interface StaffStat {
  userId: string;
  completed: number;
  inProgress: number;
  cancelled: number;
  avgRating: number | null;
  reviewCount: number;
}

/** GET /api/provider/agency/staff/performance */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-staff-perf:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();
  if (!agency) return NextResponse.json({ stats: [] });

  const staffUserIds = [
    new mongoose.Types.ObjectId(user.userId),
    ...agency.staff.map((s) => s.userId as mongoose.Types.ObjectId),
  ];

  const [jobAgg, reviewAgg] = await Promise.all([
    Job.aggregate([
      { $match: { providerId: { $in: staffUserIds } } },
      {
        $group: {
          _id: { userId: "$providerId", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]),
    Review.aggregate([
      { $match: { providerId: { $in: staffUserIds } } },
      {
        $group: {
          _id: "$providerId",
          avgRating:   { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Build lookup maps
  const jobMap: Record<string, { completed: number; inProgress: number; cancelled: number }> = {};
  for (const row of jobAgg) {
    const uid = String(row._id.userId);
    if (!jobMap[uid]) jobMap[uid] = { completed: 0, inProgress: 0, cancelled: 0 };
    if (row._id.status === "completed")   jobMap[uid].completed   += row.count;
    if (row._id.status === "in_progress") jobMap[uid].inProgress  += row.count;
    if (row._id.status === "cancelled")   jobMap[uid].cancelled   += row.count;
  }
  const reviewMap: Record<string, { avgRating: number; reviewCount: number }> = {};
  for (const row of reviewAgg) {
    reviewMap[String(row._id)] = { avgRating: row.avgRating, reviewCount: row.reviewCount };
  }

  const stats: StaffStat[] = staffUserIds.map((uid) => {
    const key = String(uid);
    return {
      userId:      key,
      completed:   jobMap[key]?.completed   ?? 0,
      inProgress:  jobMap[key]?.inProgress  ?? 0,
      cancelled:   jobMap[key]?.cancelled   ?? 0,
      avgRating:   reviewMap[key]?.avgRating   ?? null,
      reviewCount: reviewMap[key]?.reviewCount ?? 0,
    };
  });

  return NextResponse.json({ stats });
});
