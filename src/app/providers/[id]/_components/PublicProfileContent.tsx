import { notFound } from "next/navigation";
import { providerProfileService } from "@/services";
import { reviewRepository } from "@/repositories";
import PublicProfileClient, {
  type ProviderProfileData,
  type ReviewData,
} from "./PublicProfileClient";

const INITIAL_LIMIT = 10;

export default async function PublicProfileContent({
  providerId,
}: {
  providerId: string;
}) {
  const [rawProfile, breakdown, streak, allReviews] = await Promise.all([
    providerProfileService.getProfile(providerId).catch(() => null),
    reviewRepository.getProviderBreakdownSummary(providerId).catch(() => null),
    reviewRepository.getFiveStarStreak(providerId).catch(() => 0),
    reviewRepository.findWithPopulation({ providerId } as never).catch(() => []),
  ]);

  if (!rawProfile) notFound();

  const totalReviews = allReviews.length;
  const initialReviews = allReviews.slice(0, INITIAL_LIMIT);

  const profile: ProviderProfileData = JSON.parse(
    JSON.stringify({
      ...rawProfile,
      breakdown: breakdown ?? null,
      streak: streak ?? 0,
    })
  );

  const reviews: ReviewData[] = JSON.parse(JSON.stringify(initialReviews));

  return (
    <PublicProfileClient
      profile={profile}
      initialReviews={reviews}
      totalReviews={totalReviews}
      providerId={providerId}
    />
  );
}
