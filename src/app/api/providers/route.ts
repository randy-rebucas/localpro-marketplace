import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";

/**
 * GET /api/providers
 * Lists all providers with public profile data.
 * Clients get a `isFavorite` flag on each result.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const availability = searchParams.get("availability") ?? "";

  const matchStage: Record<string, unknown> = {};
  if (availability) matchStage.availabilityStatus = availability;

  const providers = await ProviderProfile.find(matchStage)
    .populate("userId", "name email isVerified isSuspended role")
    .lean();

  // Filter out suspended users
  let filtered = providers.filter(
    (p) =>
      !(
        p as unknown as {
          userId: { isSuspended?: boolean; role?: string };
        }
      ).userId?.isSuspended
  );

  // Text search across name, bio, skills
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) => {
      const pp = p as unknown as {
        userId: { name?: string };
        bio?: string;
        skills?: string[];
      };
      return (
        pp.userId?.name?.toLowerCase().includes(q) ||
        pp.bio?.toLowerCase().includes(q) ||
        pp.skills?.some((s) => s.toLowerCase().includes(q))
      );
    });
  }

  // Attach isFavorite flag for clients
  const favoriteIds =
    user.role === "client"
      ? new Set(await favoriteProviderRepository.getFavoriteProviderIds(user.userId))
      : new Set<string>();

  const results = filtered.map((p) => {
    const pp = p as unknown as { userId: { _id: { toString(): string } } };
    const providerId = pp.userId._id.toString();
    return {
      ...p,
      isFavorite: favoriteIds.has(providerId),
    };
  });

  return NextResponse.json(results);
});
