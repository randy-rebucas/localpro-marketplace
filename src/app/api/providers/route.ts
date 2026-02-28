import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";

/**
 * GET /api/providers
 * Lists all approved, non-suspended providers with public profile data.
 * Clients get a `isFavorite` flag on each result.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const availability = searchParams.get("availability") ?? "";

  const profileMatch: Record<string, unknown> = {};
  if (availability) profileMatch.availabilityStatus = availability;

  // Filter suspended and unapproved users at the database level via aggregation
  const providers = await ProviderProfile.aggregate([
    { $match: profileMatch },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userId",
      },
    },
    { $unwind: "$userId" },
    {
      $match: {
        "userId.isSuspended": { $ne: true },
        "userId.approvalStatus": "approved",
      },
    },
    {
      $project: {
        "userId.password": 0,
        "userId.__v": 0,
        "userId.verificationToken": 0,
        "userId.verificationTokenExpiry": 0,
        "userId.resetPasswordToken": 0,
        "userId.resetPasswordTokenExpiry": 0,
        "userId.otpCode": 0,
        "userId.otpExpiry": 0,
      },
    },
  ]);

  // In-memory text search across name, bio, skills
  type ProviderRow = { userId: { _id: { toString(): string }; name?: string }; bio?: string; skills?: string[] };
  let filtered = providers as ProviderRow[];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
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

  const results = filtered.map((p) => ({
    ...p,
    isFavorite: favoriteIds.has(p.userId._id.toString()),
  }));

  return NextResponse.json(results);
});
