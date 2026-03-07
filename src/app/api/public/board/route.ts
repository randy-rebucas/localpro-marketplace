/**
 * GET /api/public/board
 *
 * Fully public endpoint — no authentication required.
 * Powers the LocalPro public job display board (kiosk / TV screen).
 *
 * Returns:
 *  - jobs         Open jobs (up to 20, newest first)
 *  - leaderboard  Top 5 providers by completed job count
 *  - announcements Active announcements targeting "all"
 *  - stats        Summary counters
 *  - generatedAt  ISO timestamp of when the data was fetched
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import ProviderProfile from "@/models/ProviderProfile";
import { announcementRepository, appSettingRepository } from "@/repositories";

export const dynamic = "force-dynamic";

const BOARD_FEATURE_KEYS = [
  "board.activityFeed",
  "board.earningsWidget",
  "board.categoryDemand",
  "board.achievementsWidget",
  "board.urgentJobs",
  "board.trainingCta",
  "board.marketplaceStats",
  "board.priceGuide",
  "board.businessCta",
  "board.partners",
  "board.jobAlerts",
] as const;

export async function GET() {
  try {
    await connectDB();

    const [jobs, providerDocs, announcements, openCount, completedCount, features] =
      await Promise.all([
        // Open jobs — newest first, capped at 20
        Job.find({ status: "open" })
          .sort({ createdAt: -1 })
          .limit(20)
          .select("_id title category location budget scheduleDate createdAt")
          .lean(),

        // Top 5 providers by lifetime completed jobs
        ProviderProfile.find({ completedJobCount: { $gt: 0 } })
          .sort({ completedJobCount: -1 })
          .limit(5)
          .select("userId avgRating completedJobCount completionRate isLocalProCertified")
          .populate("userId", "name avatar")
          .lean(),

        // Public / all-target active announcements
        announcementRepository.findActiveForRole("all"),

        // Stats
        Job.countDocuments({ status: "open" }),
        Job.countDocuments({ status: "completed" }),

        // All board feature flags in one query
        appSettingRepository.findByKeys([...BOARD_FEATURE_KEYS]),
      ]);

    const leaderboard = providerDocs.map((p, idx) => {
      const user = p.userId as { name?: string; avatar?: string | null } | null;
      return {
        rank: idx + 1,
        _id: p._id?.toString(),
        name: user?.name ?? "Provider",
        avatar: user?.avatar ?? null,
        completedJobCount: p.completedJobCount,
        avgRating: p.avgRating,
        completionRate: p.completionRate,
        isLocalProCertified: p.isLocalProCertified,
      };
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        _id: j._id?.toString(),
        title: j.title,
        category: j.category,
        location: j.location,
        budget: j.budget,
        scheduleDate: j.scheduleDate,
        createdAt: j.createdAt,
      })),
      leaderboard,
      announcements: announcements.map((a) => ({
        _id: a._id?.toString(),
        title: a.title,
        message: a.message,
        type: a.type,
      })),
      stats: {
        openJobs: openCount,
        completedJobs: completedCount,
        topProviders: leaderboard.length,
      },
      features: {
        activityFeed:      features["board.activityFeed"] === true,
        earningsWidget:    features["board.earningsWidget"] === true,
        categoryDemand:    features["board.categoryDemand"] === true,
        achievementsWidget: features["board.achievementsWidget"] === true,
        urgentJobs:        features["board.urgentJobs"] === true,
        trainingCta:       features["board.trainingCta"] === true,
        marketplaceStats:  features["board.marketplaceStats"] === true,
        priceGuide:        features["board.priceGuide"] === true,
        businessCta:       features["board.businessCta"] === true,
        partners:          features["board.partners"] === true,
        jobAlerts:         features["board.jobAlerts"] === true,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/public/board]", err);
    return NextResponse.json({ error: "Failed to load board data" }, { status: 500 });
  }
}
