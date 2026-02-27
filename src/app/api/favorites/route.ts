import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";
import ProviderProfile from "@/models/ProviderProfile";
import { connectDB } from "@/lib/db";

/** GET /api/favorites — list client's favorite providers with profiles */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  await connectDB();
  const favorites = await favoriteProviderRepository.findByClient(user.userId);

  // Enrich each favorite with the provider's profile
  const providerIds = favorites.map(
    (f) =>
      (f as unknown as { providerId: { _id?: string; toString(): string } })
        .providerId?._id?.toString() ??
      (f as unknown as { providerId: { toString(): string } }).providerId?.toString()
  );

  const profiles = await ProviderProfile.find({ userId: { $in: providerIds } })
    .select("userId bio skills yearsExperience hourlyRate avgRating completedJobCount availabilityStatus")
    .lean();

  const profileMap = new Map(
    profiles.map((p) => [
      (p as unknown as { userId: { toString(): string } }).userId.toString(),
      p,
    ])
  );

  const enriched = favorites.map((f) => {
    const fav = f as unknown as {
      _id: { toString(): string };
      providerId: { _id?: string; toString(): string; name?: string; email?: string };
      createdAt: Date;
    };
    const pid =
      fav.providerId?._id?.toString() ?? fav.providerId?.toString();
    return {
      _id: fav._id.toString(),
      provider: fav.providerId,
      profile: profileMap.get(pid ?? "") ?? null,
      createdAt: fav.createdAt,
    };
  });

  return NextResponse.json(enriched);
});

/** POST /api/favorites — add a provider to favorites */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { providerId } = await req.json();
  if (!providerId) {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }

  await favoriteProviderRepository.addFavorite(user.userId, providerId);
  return NextResponse.json({ favorited: true });
});
