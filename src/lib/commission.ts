export interface CommissionBreakdown {
  gross: number;
  commission: number;
  netAmount: number;
  rate: number;
}

/** Base platform commission rate (standard services) */
export const BASE_COMMISSION_RATE = 0.15;

/** Elevated commission rate for high-value / specialized services */
export const HIGH_COMMISSION_RATE = 0.20;

/**
 * Categories that carry a higher commission rate due to complexity,
 * higher job values, or elevated risk.
 *
 * Standard services: 15%
 * High-value / specialized: 20%
 */
export const HIGH_VALUE_CATEGORIES = new Set([
  // Exact names from spec
  "HVAC",
  "Roofing",
  "Major Home Renovation",
  "Construction Contracts",
  "Commercial Maintenance Projects",
  // Mapped from current DB category seeds
  "Masonry & Tiling",
  "Welding & Fabrication",
  "Mechanical & Industrial",
  "Safety & Security",
]);

/**
 * Returns the correct commission rate decimal for the given category name.
 * Returns HIGH_COMMISSION_RATE (0.20) for high-value categories,
 * BASE_COMMISSION_RATE (0.15) for everything else.
 */
export function getCommissionRate(category?: string | null): number {
  if (category && HIGH_VALUE_CATEGORIES.has(category)) return HIGH_COMMISSION_RATE;
  return BASE_COMMISSION_RATE;
}

/**
 * Calculate platform commission on a transaction.
 * @param amount - Gross amount paid by client
 * @param rate - Commission rate as decimal (default 15%; use getCommissionRate(category) for dynamic rate)
 */
export function calculateCommission(
  amount: number,
  rate = BASE_COMMISSION_RATE
): CommissionBreakdown {
  const commission = Math.round(amount * rate * 100) / 100;
  const netAmount = Math.round((amount - commission) * 100) / 100;
  return { gross: amount, commission, netAmount, rate };
}
