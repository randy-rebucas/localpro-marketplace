import { Types } from "mongoose";
import { getProviderTier, type TierInfo } from "@/lib/tier";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { reviewRepository } from "@/repositories/review.repository";

/** Marketplace tiers (Bronze → Elite) — informational label for UI/API copy */
export const MARKETPLACE_TIER_NOTE =
  "Marketplace tiers on LocalPro: Bronze, Silver, Gold, and Elite Pro (based on jobs completed, star rating, and completion rate).";

export interface RecentFeedbackInput {
  rating: number;
  excerpt: string;
  createdAtIso: string;
}

export interface ProviderPerformanceReportInput {
  completedJobCount: number;
  completionRate: number;
  avgResponseTimeHours: number;
  avgRating: number;
  reviewCount: number;
  breakdown:
    | null
    | {
        quality: number;
        professionalism: number;
        punctuality: number;
        communication: number;
        count: number;
      };
  fiveStarStreak: number;
  recentFeedback: RecentFeedbackInput[];
}

export type RecommendationType = "improvement" | "recognition";

export interface PerformanceRecommendation {
  type: RecommendationType;
  title: string;
  detail: string;
}

export interface ProviderPerformanceMetrics {
  avgRating: number;
  reviewCount: number;
  punctualityAverage: number | null;
  /** Shown when dimensional breakdown is unavailable */
  punctualityNote: string | null;
  dimensionalBreakdown: {
    quality: number | null;
    professionalism: number | null;
    punctuality: number | null;
    communication: number | null;
    breakdownReviewCount: number;
  };
  completionRate: number;
  completedJobCount: number;
  avgResponseTimeHours: number;
  responsivenessNote: string | null;
}

export interface ProviderPerformanceReportResult {
  generatedAt: string;
  metrics: ProviderPerformanceMetrics;
  tier: TierInfo;
  recommendations: PerformanceRecommendation[];
  summaryOneLiner: string;
}

export function truncateFeedbackExcerpt(text: string, maxLen = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/** Privacy-safe display label: first name only, or "Client" */
export function clientAttributionLabel(populatedClient: unknown): string {
  const name = (populatedClient as { name?: string } | null)?.name?.trim();
  if (!name) return "Client";
  const first = name.split(/\s+/)[0] ?? "";
  if (!first || first.length > 24) return "Client";
  return first;
}

function formatResponseHours(hours: number): string {
  if (hours <= 0) return "";
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hours`;
  const d = Math.round(hours / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

function pushUnique(
  list: PerformanceRecommendation[],
  rec: PerformanceRecommendation
): void {
  if (list.some((r) => r.title === rec.title)) return;
  list.push(rec);
}

export function buildRecommendations(input: ProviderPerformanceReportInput, tier: TierInfo): PerformanceRecommendation[] {
  const improvements: PerformanceRecommendation[] = [];
  const recognition: PerformanceRecommendation[] = [];

  const { completionRate, completedJobCount, avgRating, reviewCount, breakdown, avgResponseTimeHours, fiveStarStreak } =
    input;

  if (completedJobCount >= 1 && completionRate < 70) {
    pushUnique(improvements, {
      type: "improvement",
      title: "Raise your completion rate",
      detail:
        "Finish accepted jobs when possible and communicate early if timelines slip — unclear scope is the main driver of cancellations.",
    });
  }

  if (reviewCount > 0 && avgRating > 0 && avgRating < 4.0) {
    pushUnique(improvements, {
      type: "improvement",
      title: "Lift overall satisfaction",
      detail:
        "Confirm expectations before starting, send progress updates, and do a quick walkthrough at handover — small touchpoints lift ratings.",
    });
  }

  if (reviewCount === 0 && completedJobCount >= 1) {
    pushUnique(improvements, {
      type: "improvement",
      title: "Invite reviews after jobs",
      detail:
        "Ask happy clients to leave a short review — dimensional scores unlock punctuality insights once reviews include breakdown ratings.",
    });
  }

  if (breakdown && breakdown.count >= 1) {
    if (breakdown.punctuality < 4) {
      pushUnique(improvements, {
        type: "improvement",
        title: "Sharpen on-time arrival",
        detail:
          "Pad travel time, confirm the window the night before, and message early if you may be delayed — punctuality scores weigh heavily.",
      });
    }
    if (breakdown.communication < 4) {
      pushUnique(improvements, {
        type: "improvement",
        title: "Strengthen client updates",
        detail:
          "Reply within a few hours when possible and summarize next steps in writing so clients always know where things stand.",
      });
    }
    if (breakdown.quality < 4) {
      pushUnique(improvements, {
        type: "improvement",
        title: "Refine workmanship consistency",
        detail:
          "Double-check finishes against the brief and photos before closing — quality scores reflect thorough delivery.",
      });
    }
    if (breakdown.professionalism < 4) {
      pushUnique(improvements, {
        type: "improvement",
        title: "Boost professionalism signals",
        detail:
          "Clear invoices, tidy site presence, and respectful tone on-site — clients grade professionalism across the whole visit.",
      });
    }
  }

  const punctualityMissing = breakdown === null || breakdown.count === 0;
  if (punctualityMissing && avgResponseTimeHours >= 24) {
    pushUnique(improvements, {
      type: "improvement",
      title: "Speed up quote responses",
      detail:
        "With limited punctuality data yet, responsiveness matters — faster replies correlate with more booked jobs and happier clients.",
    });
  }

  if (tier.tier === "gold" || tier.tier === "elite") {
    if (fiveStarStreak >= 3) {
      pushUnique(recognition, {
        type: "recognition",
        title: "Outstanding five-star streak",
        detail: `${fiveStarStreak} consecutive five-star reviews — keep delivering this level of consistency.`,
      });
    }
  }

  if (tier.tier === "elite") {
    pushUnique(recognition, {
      type: "recognition",
      title: "Elite marketplace standing",
      detail:
        "You are in the top marketplace tier — consider mentoring newer providers or showcasing your profile as a reference standard.",
    });
  }

  if ((tier.tier === "gold" || tier.tier === "elite") && avgRating >= 4.7 && reviewCount >= 5 && completionRate >= 90) {
    pushUnique(recognition, {
      type: "recognition",
      title: "Strong reputation trajectory",
      detail:
        "Your ratings, completion rate, and volume put you in excellent standing — maintain communication habits that got you here.",
    });
  }

  return [...improvements, ...recognition];
}

export function buildSummaryOneLiner(
  input: ProviderPerformanceReportInput,
  tier: TierInfo,
  metrics: ProviderPerformanceMetrics
): string {
  if (metrics.reviewCount === 0 && metrics.completedJobCount > 0) {
    return `${tier.label} tier — complete jobs and gather reviews to unlock dimensional punctuality insights.`;
  }

  if (metrics.punctualityAverage === null && metrics.reviewCount > 0) {
    const proxy =
      metrics.avgResponseTimeHours > 0 && metrics.responsivenessNote
        ? ` Responsiveness proxy: ${metrics.responsivenessNote.replace(/\.$/, "")}.`
        : "";
    return `${tier.label} tier — punctuality needs more dimensional review data; ${proxy || "keep inviting detailed feedback."}`.trim();
  }

  if (tier.tier === "elite") {
    return `${tier.label} tier with ${metrics.reviewCount} reviews — marketplace-leading performance.`;
  }

  return `${tier.label} tier — ${metrics.avgRating.toFixed(1)}★ from ${metrics.reviewCount} review${metrics.reviewCount === 1 ? "" : "s"}, ${metrics.completionRate}% completion.`;
}

export function buildProviderPerformanceReport(
  input: ProviderPerformanceReportInput,
  generatedAt: Date = new Date()
): ProviderPerformanceReportResult {
  const tier = getProviderTier(input.completedJobCount, input.avgRating, input.completionRate);

  const breakdown = input.breakdown;
  const punctualityAvg =
    breakdown && breakdown.count > 0 ? breakdown.punctuality : null;

  const punctualityNote =
    breakdown === null || breakdown.count === 0
      ? "Punctuality — not enough dimensional review data yet."
      : null;

  const responsivenessNote =
    breakdown === null || breakdown.count === 0
      ? input.avgResponseTimeHours > 0
        ? `Typical quote response about ${formatResponseHours(input.avgResponseTimeHours)}`
        : null
      : null;

  const metrics: ProviderPerformanceMetrics = {
    avgRating: input.avgRating,
    reviewCount: input.reviewCount,
    punctualityAverage: punctualityAvg,
    punctualityNote,
    dimensionalBreakdown: {
      quality: breakdown && breakdown.count > 0 ? breakdown.quality : null,
      professionalism: breakdown && breakdown.count > 0 ? breakdown.professionalism : null,
      punctuality: breakdown && breakdown.count > 0 ? breakdown.punctuality : null,
      communication: breakdown && breakdown.count > 0 ? breakdown.communication : null,
      breakdownReviewCount: breakdown?.count ?? 0,
    },
    completionRate: input.completionRate,
    completedJobCount: input.completedJobCount,
    avgResponseTimeHours: input.avgResponseTimeHours,
    responsivenessNote,
  };

  const recommendations = buildRecommendations(input, tier);
  const summaryOneLiner = buildSummaryOneLiner(input, tier, metrics);

  return {
    generatedAt: generatedAt.toISOString(),
    metrics,
    tier,
    recommendations,
    summaryOneLiner,
  };
}

/** Loads aggregates + recent feedback for the signed-in provider user id. */
export async function loadProviderPerformanceReportInput(userId: string): Promise<ProviderPerformanceReportInput> {
  const providerOid = new Types.ObjectId(userId);
  const [profile, ratingSummary, breakdown, streak, reviews] = await Promise.all([
    providerProfileRepository.findByUserId(userId),
    reviewRepository.getProviderRatingSummary(userId),
    reviewRepository.getProviderBreakdownSummary(userId),
    reviewRepository.getFiveStarStreak(userId),
    reviewRepository.findWithPopulation({ providerId: providerOid, isHidden: { $ne: true } }, 1, 5),
  ]);

  const avgRating = ratingSummary.avgRating;
  const reviewCount = ratingSummary.count;

  const recentFeedback: RecentFeedbackInput[] = reviews.map((r) => {
    const doc = r as unknown as {
      rating: number;
      feedback?: string;
      createdAt?: Date;
      clientId?: unknown;
    };
    const raw = doc.feedback ?? "";
    return {
      rating: doc.rating,
      excerpt: truncateFeedbackExcerpt(raw),
      createdAtIso:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(0).toISOString(),
    };
  });

  return {
    completedJobCount: profile?.completedJobCount ?? 0,
    completionRate: profile?.completionRate ?? 0,
    avgResponseTimeHours: profile?.avgResponseTimeHours ?? 0,
    avgRating,
    reviewCount,
    breakdown,
    fiveStarStreak: streak,
    recentFeedback,
  };
}
