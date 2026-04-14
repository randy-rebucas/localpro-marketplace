/**
 * Provider Matcher Service
 * Finds and ranks providers based on job requirements
 */

import { providerProfileRepository, userRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import type { IJob, IUser, IProviderProfile } from "@/types";

export interface ProviderMatch {
  providerId: string;
  user: Partial<IUser>;
  profile: Partial<IProviderProfile>;
  matchScore: number;
  matchTier: "Expert" | "Experienced" | "Capable" | "Developing";
  reason: string;
}

export interface MatcherFilters {
  category: string;
  minRating?: number;
  location?: string;
  urgency?: "standard" | "same_day" | "rush";
}

export class ProviderMatcherService {
  /**
   * Search for providers matching job criteria with quality scoring
   * Returns top providers sorted by match score descending
   */
  async findProvidersForJob(
    jobData: Partial<IJob>,
    maxResults: number = 5
  ): Promise<ProviderMatch[]> {
    try {
      await connectDB();

      // Determine minimum rating threshold based on urgency
      const urgency = jobData.urgency || "standard";
      const minRating = urgency === "standard" ? 4.0 : 4.5;

      // Query provider profiles matching category + rating + availability
      const matchingUserIds = await providerProfileRepository.findUserIdsByFilters({
        skill: jobData.category,
        minRating,
        availability: "available",
      });

      if (matchingUserIds.length === 0) {
        return [];
      }

      // Fetch full provider data: profile + user
      const providerStats = await providerProfileRepository.findStatsByUserIds(matchingUserIds);
      const users = await userRepository.findByIds(matchingUserIds);

      // Calculate match scores
      const matches: ProviderMatch[] = [];

      for (const stat of providerStats) {
        const userId = stat.userId.toString();
        const user = users.find((u) => u._id.toString() === userId);

        if (!user) continue;

        const score = this.calculateMatchScore({
          rating: stat.avgRating || 0,
          completedJobs: stat.completedJobCount || 0,
          certified: stat.isLocalProCertified || false,
          urgency,
        });

        const tier = this.getMatchTier(score);
        const reason = this.generateMatchReason({
          rating: stat.avgRating || 0,
          completedJobs: stat.completedJobCount || 0,
          tier,
          category: jobData.category || "service",
        });

        matches.push({
          providerId: userId,
          user: {
            name: user.name || "Provider",
            email: user.email || "",
          },
          profile: {
            avgRating: stat.avgRating,
            completedJobCount: stat.completedJobCount,
            isLocalProCertified: stat.isLocalProCertified,
          },
          matchScore: score,
          matchTier: tier,
          reason,
        });
      }

      // Sort by score descending, return top results
      return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, maxResults);
    } catch (err) {
      console.error("[ProviderMatcherService] findProvidersForJob error:", err);
      return [];
    }
  }

  /**
   * Calculate match score (0-100) based on provider quality metrics
   */
  private calculateMatchScore(params: {
    rating: number;
    completedJobs: number;
    certified: boolean;
    urgency: string;
  }): number {
    let score = 50; // Base score

    // Rating component (0-30 points)
    // 4.0 = 0pts, 5.0 = 30pts
    const ratingPts = ((params.rating - 4.0) / 1.0) * 30;
    score += Math.max(0, Math.min(30, ratingPts));

    // Completion volume component (0-15 points)
    // 50 jobs = 0pts, 200 jobs = 15pts
    const volumePts = (Math.min(params.completedJobs, 200) / 200) * 15;
    score += volumePts;

    // LocalPro certified bonus (5 points)
    if (params.certified) {
      score += 5;
    }

    // Urgency boost for highly-rated providers on urgent jobs
    if ((params.urgency === "same_day" || params.urgency === "rush") && params.rating >= 4.7) {
      score += 5;
    }

    return Math.round(score);
  }

  /**
   * Assign match tier based on score
   */
  private getMatchTier(score: number): "Expert" | "Experienced" | "Capable" | "Developing" {
    if (score >= 90) return "Expert";
    if (score >= 75) return "Experienced";
    if (score >= 60) return "Capable";
    return "Developing";
  }

  /**
   * Generate human-readable match reason
   */
  private generateMatchReason(params: {
    rating: number;
    completedJobs: number;
    tier: string;
    category: string;
  }): string {
    const { rating, completedJobs, tier, category } = params;

    const ratingStr = rating.toFixed(1);
    const jobsStr = completedJobs.toLocaleString();

    if (tier === "Expert") {
      return `Top provider in ${category} with ${ratingStr}⭐ (${jobsStr}+ completed jobs)`;
    } else if (tier === "Experienced") {
      return `Highly-rated ${category} expert with ${ratingStr}⭐ and strong track record`;
    } else if (tier === "Capable") {
      return `Qualified ${category} provider with ${ratingStr}⭐ (${jobsStr} completed jobs)`;
    }
    return `${category} provider with ${ratingStr}⭐ and growing experience`;
  }
}

export const providerMatcherService = new ProviderMatcherService();
