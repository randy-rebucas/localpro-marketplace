import { favoriteProviderRepository } from "@/repositories/favoriteProvider.repository";
import ProviderProfile from "@/models/ProviderProfile";
import { connectDB } from "@/lib/db";
import FavoritesClient from "./FavoritesClient";
import type { FavoriteEntry } from "./FavoritesClient";

export async function FavoritesContent({ userId }: { userId: string }) {
  await connectDB();

  const favorites = await favoriteProviderRepository.findByClient(userId);

  const providerIds = favorites
    .map((f) => {
      const fav = f as unknown as {
        providerId: { _id?: string; toString(): string };
      };
      return fav.providerId?._id?.toString() ?? fav.providerId?.toString();
    })
    .filter(Boolean) as string[];

  const profiles = await ProviderProfile.find({ userId: { $in: providerIds } })
    .select(
      "userId bio skills yearsExperience hourlyRate avgRating completedJobCount availabilityStatus avgResponseTimeHours completionRate isLocalProCertified"
    )
    .lean();

  const profileMap = new Map(
    profiles.map((p) => [
      (p as unknown as { userId: { toString(): string } }).userId.toString(),
      p,
    ])
  );

  const enriched: FavoriteEntry[] = favorites.map((f) => {
    const fav = f as unknown as {
      _id: { toString(): string };
      providerId: {
        _id?: string;
        toString(): string;
        name?: string;
        email?: string;
        isVerified?: boolean;
      };
      createdAt: Date;
    };
    const pid = fav.providerId?._id?.toString() ?? fav.providerId?.toString();
    return JSON.parse(
      JSON.stringify({
        _id: fav._id.toString(),
        provider: fav.providerId,
        profile: profileMap.get(pid ?? "") ?? null,
        createdAt: fav.createdAt,
      })
    ) as FavoriteEntry;
  });

  return <FavoritesClient initialFavorites={enriched} />;
}
