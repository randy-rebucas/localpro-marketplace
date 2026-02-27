import {
  providerProfileRepository,
  reviewRepository,
  userRepository,
  skillRepository,
} from "@/repositories";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { PortfolioItem, WeeklySchedule } from "@/types";

export interface UpdateProfileInput {
  bio?: string;
  skills?: string[];
  yearsExperience?: number;
  hourlyRate?: number;
  portfolioItems?: PortfolioItem[];
  availabilityStatus?: "available" | "busy" | "unavailable";
  schedule?: WeeklySchedule;
}

export class ProviderProfileService {
  async getProfile(userId: string) {
    const profile = await providerProfileRepository.findByUserIdPopulated(userId);
    if (!profile) throw new NotFoundError("Provider profile");
    return profile;
  }

  async upsertProfile(user: TokenPayload, input: UpdateProfileInput) {
    if (user.role !== "provider") {
      throw new ForbiddenError("Only providers can update a profile");
    }
    // Record any new skills into the shared skills catalogue
    if (input.skills?.length) {
      await skillRepository.upsertMany(input.skills);
    }
    return providerProfileRepository.upsert(user.userId, input);
  }

  /**
   * Recompute avgRating and completedJobCount from the reviews collection.
   * Call after every new review submission.
   */
  async recalculateStats(providerId: string): Promise<void> {
    const reviews = await reviewRepository.findWithPopulation({
      providerId,
    } as never);

    const count = reviews.length;
    const avgRating =
      count === 0
        ? 0
        : reviews.reduce((sum, r) => sum + ((r as { rating: number }).rating ?? 0), 0) /
          count;

    await providerProfileRepository.recalculateStats(
      providerId,
      Math.round(avgRating * 10) / 10,
      count
    );
  }
}

export const providerProfileService = new ProviderProfileService();
