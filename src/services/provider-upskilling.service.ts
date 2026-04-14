import { userRepository } from "@/repositories/user.repository";
import { jobRepository } from "@/repositories/job.repository";
import { activityRepository } from "@/repositories/activity.repository";
import type { IUser } from "@/types";
import mongoose from "mongoose";

interface SkillMastery {
  category: string;
  completedCount: number;
  avgRating: number;
  totalEarnings: number;
  masteryLevel: "novice" | "intermediate" | "expert" | "master";
  masteryPercentage: number; // 0-100%
}

interface UpskillingProgress {
  providerId: string;
  totalJobsCompleted: number;
  categoriesWorked: number;
  topCategories: SkillMastery[];
  recommendedNextCategory?: string;
  overallScore: number; // 0-100
}

/**
 * ProviderUpskillingService - Track provider skill development and mastery
 * - Measures mastery based on completed jobs per category
 * - Calculates progression levels (novice → intermediate → expert → master)
 * - Recommends next skills to develop
 * - Tracks earnings by category for compensation analysis
 */
class ProviderUpskillingService {
  // Mastery thresholds
  private readonly NOVICE_THRESHOLD = 1; // 1+ jobs
  private readonly INTERMEDIATE_THRESHOLD = 5; // 5+ jobs
  private readonly EXPERT_THRESHOLD = 15; // 15+ jobs
  private readonly MASTER_THRESHOLD = 30; // 30+ jobs

  /**
   * Assess provider's skill mastery across all categories
   */
  async assessProviderSkills(
    providerId: string
  ): Promise<UpskillingProgress | null> {
    try {
      const provider = await userRepository.findById(providerId);
      if (!provider) return null;

      // Find all completed jobs by this provider
      const completedJobs = await jobRepository.find({
        providerId: new mongoose.Types.ObjectId(providerId),
        status: "completed",
      });

      // Group jobs by category and calculate mastery
      const categoryMap = new Map<string, SkillMastery>();

      for (const job of completedJobs) {
        const category = job.category;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            completedCount: 0,
            avgRating: 0,
            totalEarnings: 0,
            masteryLevel: "novice",
            masteryPercentage: 0,
          });
        }

        const skill = categoryMap.get(category)!;
        skill.completedCount++;
        skill.totalEarnings += job.budget || 0;

        // Update mastery level based on completion count
        skill.masteryLevel = this.calculateMasteryLevel(skill.completedCount);
        skill.masteryPercentage = this.calculateMasteryPercentage(
          skill.completedCount
        );
      }

      // Sort by completion count descending
      const topCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.completedCount - a.completedCount)
        .slice(0, 5);

      // Calculate average rating if available
      topCategories.forEach((skill) => {
        const jobsInCategory = completedJobs.filter(
          (j) => j.category === skill.category
        );
        if (jobsInCategory.length > 0) {
          const avgRating =
            jobsInCategory.reduce((sum, j) => sum + ((j as any).rating || 0), 0) /
            jobsInCategory.length;
          skill.avgRating = Math.min(5, avgRating || 0);
        }
      });

      // Recommend next category (highest rating but lowest completion)
      let recommendedNextCategory: string | undefined;
      if (topCategories.length < 3) {
        // Recommend developing new category if <3 specializations
        recommendedNextCategory = await this.getRecommendedCategory(
          completedJobs,
          topCategories.map((c) => c.category)
        );
      } else if (topCategories[topCategories.length - 1].masteryPercentage < 50) {
        // Continue developing weakest category to intermediate level
        recommendedNextCategory = topCategories[topCategories.length - 1].category;
      }

      // Calculate overall skill score (0-100)
      const overallScore = this.calculateOverallScore(topCategories);

      // Log skill assessment
      await activityRepository.log({
        userId: providerId,
        eventType: "admin_ledger_entry",
        metadata: {
          action: "skill_assessment",
          totalJobsCompleted: completedJobs.length,
          categoriesWorked: categoryMap.size,
          overallScore,
          topCategories: topCategories.map((c) => ({
            category: c.category,
            level: c.masteryLevel,
            count: c.completedCount,
          })),
        },
      });

      return {
        providerId,
        totalJobsCompleted: completedJobs.length,
        categoriesWorked: categoryMap.size,
        topCategories,
        recommendedNextCategory,
        overallScore,
      };
    } catch (error) {
      console.error("[ProviderUpskillingService] assessProviderSkills error:", error);
      return null;
    }
  }

  /**
   * Track job completion and update provider upskilling data
   */
  async recordJobCompletion(jobId: string, rating: number = 0): Promise<void> {
    try {
      const job = await jobRepository.getDocById(jobId);
      if (!job || !job.providerId) return;

      // Log completion event
      const providerIdStr = typeof job.providerId === "string" ? job.providerId : job.providerId.toString();
      await activityRepository.log({
        userId: providerIdStr,
        eventType: "admin_ledger_entry",
        jobId: jobId,
        metadata: {
          action: "job_completed",
          category: job.category,
          budget: job.budget,
          rating,
        },
      });
    } catch (error) {
      console.error(
        "[ProviderUpskillingService] recordJobCompletion error:",
        error
      );
    }
  }

  /**
   * Calculate mastery level based on job completion count
   */
  private calculateMasteryLevel(
    completedCount: number
  ): "novice" | "intermediate" | "expert" | "master" {
    if (completedCount >= this.MASTER_THRESHOLD) return "master";
    if (completedCount >= this.EXPERT_THRESHOLD) return "expert";
    if (completedCount >= this.INTERMEDIATE_THRESHOLD) return "intermediate";
    return "novice";
  }

  /**
   * Calculate mastery percentage (0-100) toward next level
   */
  private calculateMasteryPercentage(completedCount: number): number {
    if (completedCount >= this.MASTER_THRESHOLD) {
      return 100;
    } else if (completedCount >= this.EXPERT_THRESHOLD) {
      // Expert: 15-30 = 50-100%
      const progress = completedCount - this.EXPERT_THRESHOLD;
      const max = this.MASTER_THRESHOLD - this.EXPERT_THRESHOLD;
      return 50 + (progress / max) * 50;
    } else if (completedCount >= this.INTERMEDIATE_THRESHOLD) {
      // Intermediate: 5-15 = 25-50%
      const progress = completedCount - this.INTERMEDIATE_THRESHOLD;
      const max = this.EXPERT_THRESHOLD - this.INTERMEDIATE_THRESHOLD;
      return 25 + (progress / max) * 25;
    } else if (completedCount >= this.NOVICE_THRESHOLD) {
      // Novice: 1-5 = 0-25%
      const progress = completedCount - this.NOVICE_THRESHOLD;
      const max = this.INTERMEDIATE_THRESHOLD - this.NOVICE_THRESHOLD;
      return (progress / max) * 25;
    }
    return 0;
  }

  /**
   * Calculate overall skill score (0-100)
   * Based on breadth (category count) and depth (max mastery level)
   */
  private calculateOverallScore(topCategories: SkillMastery[]): number {
    if (topCategories.length === 0) return 0;

    // Depth: highest mastery level
    const masterLevels = {
      novice: 10,
      intermediate: 40,
      expert: 70,
      master: 100,
    };

    const maxDepth =
      masterLevels[topCategories[0].masteryLevel as keyof typeof masterLevels] ||
      0;

    // Breadth: more categories = higher score (capped at 5 categories)
    const breadth = Math.min(topCategories.length * 10, 25);

    // Average completion rate across top categories
    const avgCompletion =
      topCategories.reduce((sum, c) => sum + c.masteryPercentage, 0) /
      topCategories.length;

    // Weighted score: depth (60%) + breadth (15%) + avg completion (25%)
    const score = maxDepth * 0.6 + breadth * 0.15 + avgCompletion * 0.25;

    return Math.min(100, Math.round(score));
  }

  /**
   * Recommend next category to develop
   */
  private async getRecommendedCategory(
    completedJobs: any[],
    excludeCategories: string[]
  ): Promise<string | undefined> {
    // Placeholder: recommend "general" or most in-demand category
    const allCategories = ["cleaning", "moving", "painting", "repair", "delivery"];
    const available = allCategories.filter(
      (c) => !excludeCategories.includes(c)
    );

    return available[0];
  }

  /**
   * Generate upskilling recommendations for provider
   */
  async generateRecommendations(providerId: string): Promise<{
    currentMastery: SkillMastery | null;
    nextMilestone: string;
    progressToMilestone: number; // 0-100%
    suggestedFocusArea: string | null;
  }> {
    try {
      const progress = await this.assessProviderSkills(providerId);
      if (!progress || progress.topCategories.length === 0) {
        return {
          currentMastery: null,
          nextMilestone: "Complete first job in any category",
          progressToMilestone: 0,
          suggestedFocusArea: "general",
        };
      }

      const topSkill = progress.topCategories[0];

      // Determine next milestone
      let nextMilestone = "";
      let progressToMilestone = 0;

      if (topSkill.masteryLevel === "novice") {
        nextMilestone = `Reach Intermediate in ${topSkill.category} (5 jobs)`;
        progressToMilestone = (topSkill.completedCount / 5) * 100;
      } else if (topSkill.masteryLevel === "intermediate") {
        nextMilestone = `Reach Expert in ${topSkill.category} (15 jobs)`;
        progressToMilestone = (topSkill.completedCount / 15) * 100;
      } else if (topSkill.masteryLevel === "expert") {
        nextMilestone = `Reach Master in ${topSkill.category} (30 jobs)`;
        progressToMilestone = (topSkill.completedCount / 30) * 100;
      } else {
        nextMilestone = `Master a new category`;
        progressToMilestone = 0;
      }

      return {
        currentMastery: topSkill,
        nextMilestone: nextMilestone.substring(0, 100), // Truncate for display
        progressToMilestone: Math.min(100, Math.round(progressToMilestone)),
        suggestedFocusArea: progress.recommendedNextCategory || null,
      };
    } catch (error) {
      console.error(
        "[ProviderUpskillingService] generateRecommendations error:",
        error
      );
      return {
        currentMastery: null,
        nextMilestone: "No data available",
        progressToMilestone: 0,
        suggestedFocusArea: null,
      };
    }
  }
}

export const providerUpskillingService = new ProviderUpskillingService();
