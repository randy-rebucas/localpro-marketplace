import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import Review from "@/models/Review";
import AgencyProfile from "@/models/AgencyProfile";

/** GET /api/provider/agency/reviews?rating=<1-5>&sort=newest|highest|lowest&search=<text>&page=<n>&limit=<n>
 *  Returns all reviews received by this provider and their agency staff, with aggregate stats.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-reviews:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const ratingFilter = searchParams.get("rating");
  const sortParam    = searchParams.get("sort") ?? "newest";
  const searchParam  = searchParams.get("search")?.trim() ?? "";
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip  = (page - 1) * limit;

  const providerOid = new mongoose.Types.ObjectId(user.userId);

  // Include agency staff reviews
  const agency = await AgencyProfile.findOne({ providerId: providerOid }, "staff").lean();
  const staffOids = [
    providerOid,
    ...(agency?.staff?.map((s) => new mongoose.Types.ObjectId(String(s.userId))) ?? []),
  ];

  const baseFilter: Record<string, unknown> = { providerId: { $in: staffOids } };
  if (ratingFilter !== null) {
    const rating = parseInt(ratingFilter, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ValidationError("rating must be between 1 and 5.");
    }
    baseFilter.rating = rating;
  }
  if (searchParam)  baseFilter.feedback = { $regex: searchParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  // Sort order
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest:  { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest:  { rating: 1,  createdAt: -1 },
  };
  const sortOrder = sortMap[sortParam] ?? sortMap.newest;

  const statsFilter = { providerId: { $in: staffOids } };

  const [reviews, total, allRatings] = await Promise.all([
    Review.find(baseFilter)
      .populate("clientId", "name email avatar")
      .populate("jobId", "title category")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(baseFilter),
    // Fetch rating + sub-breakdown for overall stats (no rating/search filter)
    Review.find(statsFilter, "rating breakdown").lean(),
  ]);

  // Overall stats
  const totalCount = allRatings.length;
  const avgRating  = totalCount > 0
    ? allRatings.reduce((s, r) => s + (r.rating as number), 0) / totalCount
    : 0;
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allRatings.filter((r) => r.rating === star).length,
  }));

  // Sub-dimension averages (quality / professionalism / punctuality / communication)
  type BD = { quality?: number; professionalism?: number; punctuality?: number; communication?: number };
  const withBD = allRatings.filter((r) => r.breakdown);
  function dimAvg(key: keyof BD) {
    const vals = withBD.map((r) => (r.breakdown as BD | null)?.[key]).filter((v): v is number => v != null);
    return vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
  }
  const dimensions = {
    quality:         dimAvg("quality"),
    professionalism: dimAvg("professionalism"),
    punctuality:     dimAvg("punctuality"),
    communication:   dimAvg("communication"),
  };

  return NextResponse.json({
    reviews,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      avgRating:  Math.round(avgRating * 10) / 10,
      totalCount,
      breakdown:  ratingBreakdown,
      dimensions,
    },
  });
});
