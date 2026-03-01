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
    if (profile) return profile;

    // Provider exists but hasn't filled in their profile yet.
    // Return minimal user data so the modal renders instead of erroring.
    const user = await userRepository.findById(userId) as unknown as {
      name: string; email: string; isVerified?: boolean;
    } | null;
    if (!user) throw new NotFoundError("Provider");

    return {
      userId: { name: user.name, email: user.email, isVerified: user.isVerified ?? false },
      bio: "",
      skills: [] as string[],
      yearsExperience: 0,
      hourlyRate: null as number | null,
      avgRating: 0,
      completedJobCount: 0,
      availabilityStatus: "available" as const,
      schedule: undefined,
    };
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
