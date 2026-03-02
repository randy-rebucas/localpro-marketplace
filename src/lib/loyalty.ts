import type { ClientTier } from "@/types";

export interface TierInfo {
  tier: ClientTier;
  label: string;
  color: string; // Tailwind color token
  next: string | null;
  pointsToNext: number;
  progress: number; // 0-100
}

const TIERS: Array<{ tier: ClientTier; label: string; color: string; min: number }> = [
  { tier: "standard", label: "Standard", color: "slate",  min: 0 },
  { tier: "silver",   label: "Silver",   color: "blue",   min: 500 },
  { tier: "gold",     label: "Gold",     color: "amber",  min: 2000 },
  { tier: "platinum", label: "Platinum", color: "violet", min: 5000 },
];

export const TIER_MULTIPLIER: Record<ClientTier, number> = {
  standard: 1.0,
  silver:   1.0,
  gold:     1.05,
  platinum: 1.10,
};

/** Compute tier + progress for a client based on lifetime points. */
export function getClientTier(lifetimePoints: number): TierInfo {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (lifetimePoints >= t.min) current = t;
  }

  const idx = TIERS.indexOf(current);
  const next = TIERS[idx + 1] ?? null;

  const progress = next
    ? Math.min(99, Math.round(((lifetimePoints - current.min) / (next.min - current.min)) * 100))
    : 100;

  const pointsToNext = next ? Math.max(0, next.min - lifetimePoints) : 0;

  return {
    tier: current.tier,
    label: current.label,
    color: current.color,
    next: next?.label ?? null,
    pointsToNext,
    progress,
  };
}

/** Determine which tier a lifetime-points value belongs to. */
export function tierFromPoints(lifetimePoints: number): ClientTier {
  return getClientTier(lifetimePoints).tier;
}

/** Convert redeemable points to ₱ credit value. 100 pts = ₱10. */
export function pointsToCredits(points: number): number {
  return Math.floor(points / 100) * 10;
}

/** Generate a random 8-character alphanumeric referral code. */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusable chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
