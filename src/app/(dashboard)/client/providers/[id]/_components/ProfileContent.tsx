import { notFound } from "next/navigation";
import { providerProfileService } from "@/services";
import { reviewRepository, favoriteProviderRepository } from "@/repositories";
import ProfileClient, {
  type ProviderProfileData,
  type ReviewData,
} from "./ProfileClient";

const INITIAL_LIMIT = 10;

export default async function ProfileContent({
  providerId,
  currentUserId,
}: {
  providerId: string;
  currentUserId: string;
}) {
  const [rawProfile, breakdown, streak, allReviews, isFav] = await Promise.all([
    providerProfileService.getProfile(providerId).catch(() => null),
    reviewRepository.getProviderBreakdownSummary(providerId).catch(() => null),
    reviewRepository.getFiveStarStreak(providerId).catch(() => 0),
    reviewRepository.findWithPopulation({ providerId } as never).catch(() => []),
    favoriteProviderRepository.isFavorite(currentUserId, providerId).catch(() => false),
  ]);

  if (!rawProfile) notFound();

  const totalReviews = allReviews.length;
  const initialReviews = allReviews.slice(0, INITIAL_LIMIT);

  // Serialize to plain objects for the client boundary
  const profile: ProviderProfileData = JSON.parse(
    JSON.stringify({
      ...rawProfile,
      breakdown: breakdown ?? null,
      streak: streak ?? 0,
    })
  );

  const reviews: ReviewData[] = JSON.parse(JSON.stringify(initialReviews));

  return (
    <ProfileClient
      profile={profile}
      initialReviews={reviews}
      totalReviews={totalReviews}
      providerId={providerId}
      isFavoriteInitial={isFav}
    />
  );
}
