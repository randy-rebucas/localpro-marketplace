import {
  providerProfileRepository,
  reviewRepository,
  userRepository,
  skillRepository,
} from "@/repositories";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { PortfolioItem, WeeklySchedule } from "@/types";

// Skill interface matching frontend and database schema
interface SkillEntry {
  skill: string;
  yearsExperience: number;
  hourlyRate: string;
}

export interface UpdateProfileInput {
  bio?: string;
  skills?: SkillEntry[];
  yearsExperience?: number;
  hourlyRate?: number;
  portfolioItems?: PortfolioItem[];
  availabilityStatus?: "available" | "busy" | "unavailable";
  schedule?: WeeklySchedule;
}

export class ProviderProfileService {
  async getProfile(userId: string) {
    // First try userId lookup; if not found, the id may be a ProviderProfile _id —
    // resolve the real userId from it and retry.
    let resolvedUserId = userId;
    let directProfile = await providerProfileRepository.findByUserIdPopulated(userId);
    if (!directProfile) {
      try {
        const { default: ProviderProfile } = await import("@/models/ProviderProfile");
        const byId = await ProviderProfile.findById(userId).select("userId").lean() as { userId: unknown } | null;
        if (byId?.userId) {
          resolvedUserId = String(byId.userId);
          directProfile = await providerProfileRepository.findByUserIdPopulated(resolvedUserId);
        }
      } catch { /* invalid ObjectId or not a profile _id — fall through to NotFoundError */ }
    }

    const [profile, ratingStats, agencyDoc] = await Promise.all([
      Promise.resolve(directProfile),
      reviewRepository.getProviderRatingSummary(resolvedUserId),
      (async () => {
        try {
          const { default: AgencyProfile } = await import("@/models/AgencyProfile");
          return AgencyProfile.findOne({ providerId: resolvedUserId }, "name plan staff").lean();
        } catch { return null; }
      })(),
    ]);

    type AgencyLean = { name: string; plan?: string; staff?: unknown[] };
    const agency = agencyDoc
      ? { name: (agencyDoc as AgencyLean).name, staffCount: (agencyDoc as AgencyLean).staff?.length ?? 0, plan: (agencyDoc as AgencyLean).plan ?? "starter" }
      : null;

    if (profile) {
      // Overlay cached stats with live aggregation so the modal always reflects
      // the true rating even if recalculateStats was never called for this provider.
      const liveProfile = profile as unknown as Record<string, unknown>;
      liveProfile.avgRating = Math.round(ratingStats.avgRating * 10) / 10;
      liveProfile.completedJobCount = ratingStats.count;
      liveProfile.agency = agency;
      return profile;
    }

    // Provider exists but hasn't filled in their profile yet.
    // Return minimal user data so the modal renders instead of erroring.
    const user = await userRepository.findById(resolvedUserId) as unknown as {
      name: string; email: string; isVerified?: boolean;
    } | null;
    if (!user) throw new NotFoundError("Provider");

    return {
      userId: { name: user.name, email: user.email, isVerified: user.isVerified ?? false },
      bio: "",
      skills: [] as Array<{ skill: string; yearsExperience: number; hourlyRate: string }>,
      yearsExperience: 0,
      hourlyRate: null as number | null,
      avgRating: Math.round(ratingStats.avgRating * 10) / 10,
      completedJobCount: ratingStats.count,
      availabilityStatus: "available" as const,
      schedule: undefined,
      agency,
    };
  }

  async upsertProfile(user: TokenPayload, input: UpdateProfileInput) {
    if (user.role !== "provider") {
      throw new ForbiddenError("Only providers can update a profile");
    }
    // Record any new skills into the shared skills catalogue (extract skill names from objects)
    if (input.skills?.length) {
      const skillNames = input.skills.map((s) => s.skill);
      await skillRepository.upsertMany(skillNames);
    }
    const dataToUpsert: Partial<UpdateProfileInput> = {
      bio: input.bio,
      yearsExperience: input.yearsExperience,
      hourlyRate: input.hourlyRate,
      portfolioItems: input.portfolioItems,
      availabilityStatus: input.availabilityStatus,
      schedule: input.schedule,
      skills: input.skills?.length ? input.skills : undefined,
    };
    return providerProfileRepository.upsert(user.userId, dataToUpsert as Parameters<typeof providerProfileRepository.upsert>[1]);
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
