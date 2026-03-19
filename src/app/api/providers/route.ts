import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";
import { featuredListingRepository } from "@/repositories/featuredListing.repository";
import type { PipelineStage } from "mongoose";

/**
 * GET /api/providers
 * Returns all approved, non-suspended provider accounts with their profile data.
 * Providers without a ProviderProfile document are included with empty profile fields.
 * Clients receive an `isFavorite` flag on each result.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const availability = searchParams.get("availability") ?? "";

  type ProviderRow = {
    userId: { _id: { toString(): string }; name?: string };
    bio?: string;
    skills?: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>;
    availabilityStatus?: string;
  };

  // Start from users so providers without a ProviderProfile are still included.
  const pipeline: PipelineStage[] = [
    {
      $match: {
        role: "provider",
        isSuspended: { $ne: true },
        approvalStatus: "approved",
      },
    },
    {
      $lookup: {
        from: "providerprofiles",
        localField: "_id",
        foreignField: "userId",
        as: "profileArr",
      },
    },
    {
      $addFields: { profileDoc: { $arrayElemAt: ["$profileArr", 0] } },
    },
    {
      // Reshape to the same interface the frontend expects
      $project: {
        userId: {
          _id: "$_id",
          name: "$name",
          email: "$email",
          isVerified: "$isVerified",
        },
        bio:               { $ifNull: ["$profileDoc.bio", ""] },
        skills:            { $ifNull: ["$profileDoc.skills", []] },
        yearsExperience:   { $ifNull: ["$profileDoc.yearsExperience", 0] },
        hourlyRate:        { $ifNull: ["$profileDoc.hourlyRate", null] },
        avgRating:         { $ifNull: ["$profileDoc.avgRating", 0] },
        completedJobCount: { $ifNull: ["$profileDoc.completedJobCount", 0] },
        completionRate:    { $ifNull: ["$profileDoc.completionRate", 100] },
        avgResponseTimeHours: { $ifNull: ["$profileDoc.avgResponseTimeHours", 0] },
        availabilityStatus: {
          $ifNull: ["$profileDoc.availabilityStatus", "available"],
        },
        isLocalProCertified: { $ifNull: ["$profileDoc.isLocalProCertified", false] },
      },
    },
  ];

  // Availability filter applied post-project where the field is correctly named
  if (availability) {
    pipeline.push({ $match: { availabilityStatus: availability } });
  }

  let providers = (await User.aggregate(pipeline)) as ProviderRow[];

  // In-memory text search across name, bio, skills
  if (search) {
    const q = search.toLowerCase();
    providers = providers.filter(
      (p) =>
        p.userId?.name?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q) ||
        p.skills?.some((s) => s.toLowerCase().includes(q))
    );
  }

  // Attach isFavorite flag for clients
  const favoriteIds =
    user.role === "client"
      ? new Set(await favoriteProviderRepository.getFavoriteProviderIds(user.userId))
      : new Set<string>();

  // Fetch active featured provider IDs for boost badges + sort priority
  const [featuredIds, topSearchIds] = await Promise.all([
    featuredListingRepository.findActiveProviderIdsByType("featured_provider"),
    featuredListingRepository.findActiveProviderIdsByType("top_search"),
  ]);
  const featuredSet  = new Set(featuredIds);
  const topSearchSet = new Set(topSearchIds);

  const results = providers.map((p) => ({
    ...p,
    isFavorite:  favoriteIds.has(p.userId._id.toString()),
    isFeatured:  featuredSet.has(p.userId._id.toString()),
    isTopSearch: topSearchSet.has(p.userId._id.toString()),
  }));

  // Sort: featured_provider first, then top_search, then the rest
  results.sort((a, b) => {
    const scoreA = (a.isFeatured ? 2 : 0) + (a.isTopSearch ? 1 : 0);
    const scoreB = (b.isFeatured ? 2 : 0) + (b.isTopSearch ? 1 : 0);
    return scoreB - scoreA;
  });

  return NextResponse.json(results);
});
