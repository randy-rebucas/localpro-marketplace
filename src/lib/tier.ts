/**
 * Provider tier system: Bronze → Silver → Gold → Elite
 *
 * Gold and Elite unlock AI-powered features.
 */

export type ProviderTier = "bronze" | "silver" | "gold" | "elite";

export interface TierInfo {
  tier: ProviderTier;
  label: string;
  emoji: string;
  /** Tailwind color token (e.g. "amber") – use in bg-{color}-100, text-{color}-800, etc. */
  color: string;
  /** Label of the next tier, or null if already at the top */
  next: string | null;
  /** Short progress hint shown under the progress bar */
  nextMsg: string;
  /** 0-100 progress toward next tier (100 when no next tier) */
  progress: number;
  /** True for Gold and Elite – gates AI features */
  hasAIAccess: boolean;
}

/**
 * Thresholds
 *
 * Bronze  : default (< 10 jobs OR < 4.0 ★)
 * Silver  : 10+ jobs, 4.0 ★
 * Gold    : 30+ jobs, 4.5 ★, 85 %+ completion  → AI unlocked
 * Elite   : 75+ jobs, 4.8 ★, 90 %+ completion  → AI unlocked + lowest commission
 */
export function getProviderTier(
  completedJobCount: number,
  avgRating: number,
  completionRate: number
): TierInfo {
  if (completedJobCount >= 75 && avgRating >= 4.8 && completionRate >= 90) {
    return {
      tier: "elite",
      label: "Elite Pro",
      emoji: "💎",
      color: "violet",
      next: null,
      nextMsg: "",
      progress: 100,
      hasAIAccess: true,
    };
  }

  if (completedJobCount >= 30 && avgRating >= 4.5 && completionRate >= 85) {
    const progress = Math.min(99, Math.round((completedJobCount / 75) * 100));
    return {
      tier: "gold",
      label: "Gold",
      emoji: "🥇",
      color: "amber",
      next: "Elite Pro",
      nextMsg: "Complete 75 jobs, 4.8 ★, 90 % completion rate",
      progress,
      hasAIAccess: true,
    };
  }

  if (completedJobCount >= 10 && avgRating >= 4.0) {
    const progress = Math.min(99, Math.round((completedJobCount / 30) * 100));
    return {
      tier: "silver",
      label: "Silver",
      emoji: "🥈",
      color: "slate",
      next: "Gold",
      nextMsg: "Complete 30 jobs, 4.5 ★, 85 % completion rate to unlock AI features",
      progress,
      hasAIAccess: false,
    };
  }

  const progress = Math.min(99, Math.round((completedJobCount / 10) * 100));
  return {
    tier: "bronze",
    label: "Bronze",
    emoji: "🥉",
    color: "orange",
    next: "Silver",
    nextMsg: "Complete 10 jobs and reach a 4.0 ★ rating",
    progress,
    hasAIAccess: false,
  };
}
