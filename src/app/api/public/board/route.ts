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
  "board.ads",
  "board.adsEnabled",
] as const;

export async function GET() {
  try {
    await connectDB();

    // Fetch the LGU filter setting first so the job query can be scoped correctly.
    // Defaults to true (Ormoc-only) when the setting hasn't been seeded yet.
    const filterMap = await appSettingRepository.findByKeys(["board.lguFilterEnabled"]);
    const lguOnly = filterMap["board.lguFilterEnabled"] !== false;

    const jobFilter = lguOnly
      ? { status: "open", location: { $regex: /ormoc/i } }
      : { status: "open" };
    const completedFilter = lguOnly
      ? { status: "completed", location: { $regex: /ormoc/i } }
      : { status: "completed" };

    const [jobs, providerDocs, announcements, openCount, completedCount, budgetAgg, features] =
      await Promise.all([
        // Open jobs — scoped by board.lguFilterEnabled setting
        Job.find(jobFilter)
          .sort({ createdAt: -1 })
          .limit(20)
          .select("_id title category location budget scheduleDate createdAt jobSource jobTags isPriority pesoPostedBy")
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

        // Stats — scoped by the same filter
        Job.countDocuments(jobFilter),
        Job.countDocuments(completedFilter),

        // Total open budget (for the board stats strip)
        Job.aggregate<{ total: number }>([
          { $match: jobFilter },
          { $group: { _id: null, total: { $sum: "$budget" } } },
        ]),

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
        jobSource: j.jobSource ?? "private",
        jobTags: j.jobTags ?? [],
        isPriority: j.isPriority ?? false,
        pesoPostedBy: j.pesoPostedBy?.toString() ?? null,
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
        totalBudget: budgetAgg[0]?.total ?? 0,
      },
      features: {
        lguFilterEnabled:  lguOnly,
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
        adsEnabled:        features["board.adsEnabled"] !== false,
      },
      ads: Array.isArray(features["board.ads"]) ? features["board.ads"] : null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/public/board]", err);
    return NextResponse.json({ error: "Failed to load board data" }, { status: 500 });
  }
}
