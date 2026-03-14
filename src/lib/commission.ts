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
 * Default escrow service fee rate (whole-number %).
 * This mirrors the `payments.escrowServiceFeeRate` AppSetting default.
 * Used by client-side UI components that cannot call async server-side helpers.
 */
export const DEFAULT_ESCROW_FEE_RATE_PERCENT = 2;

/**
 * Default payment processing fee rate (whole-number %).
 * This mirrors the `payments.processingFeeRate` AppSetting default.
 * Used by client-side UI components that cannot call async server-side helpers.
 */
export const DEFAULT_PROCESSING_FEE_RATE_PERCENT = 2;
/** Default flat withdrawal fee for bank transfers (PHP). Mirrors `payments.withdrawalFeeBank`. */
export const DEFAULT_WITHDRAWAL_FEE_BANK = 20;
/** Default flat withdrawal fee for GCash / Maya payouts (PHP). Mirrors `payments.withdrawalFeeGcash`. */
export const DEFAULT_WITHDRAWAL_FEE_GCASH = 15;

/** Urgency levels for same-day / rush bookings. */
export type UrgencyLevel = "standard" | "same_day" | "rush";

/** Default urgent booking fee for same-day service (PHP). Mirrors `payments.urgencyFeeSameDay`. */
export const DEFAULT_URGENCY_FEE_SAME_DAY = 50;
/** Default urgent booking fee for 2-hour rush service (PHP). Mirrors `payments.urgencyFeeRush`. */
export const DEFAULT_URGENCY_FEE_RUSH = 100;

// ─── Cancellation Fee defaults ────────────────────────────────────────────────
/** Hours before scheduleDate within which cancellation is free. Mirrors `payments.cancellationWindowFreeHours`. */
export const DEFAULT_CANCELLATION_WINDOW_FREE_HOURS = 24;
/** Hours before scheduleDate for the flat fee tier. Mirrors `payments.cancellationWindowFlatHours`. */
export const DEFAULT_CANCELLATION_WINDOW_FLAT_HOURS = 12;
/** Hours before scheduleDate for the percentage fee tier. Mirrors `payments.cancellationWindowPercentHours`. */
export const DEFAULT_CANCELLATION_WINDOW_PERCENT_HOURS = 1;
/** Flat cancellation fee (PHP). Mirrors `payments.cancellationFeeFlat`. */
export const DEFAULT_CANCELLATION_FEE_FLAT = 100;
/** Percentage of job budget charged at < 1h tier (whole-number %). Mirrors `payments.cancellationFeePercent`. */
export const DEFAULT_CANCELLATION_FEE_PERCENT = 20;

// ─── Dispute Handling Fee defaults ───────────────────────────────────────────
/** Flat case handling fee charged to the losing party when a dispute is escalated (PHP). Mirrors `payments.disputeHandlingFee`. */
export const DEFAULT_DISPUTE_HANDLING_FEE = 100;

export interface DisputeHandlingFeeBreakdown {
  /** Flat handling fee in PHP. 0 when the dispute was never escalated. */
  fee: number;
  /** False when the dispute was not escalated — fee is not charged in that case. */
  isCharged: boolean;
}

/**
 * Returns the dispute case handling fee.
 * Only charged when the dispute was escalated to "investigating" before resolution.
 *
 * @param wasEscalated - true if dispute.wasEscalated is set
 * @param flatFee      - from AppSettings "payments.disputeHandlingFee"
 */
export function calculateDisputeHandlingFee(
  wasEscalated: boolean,
  flatFee = DEFAULT_DISPUTE_HANDLING_FEE
): DisputeHandlingFeeBreakdown {
  if (!wasEscalated) return { fee: 0, isCharged: false };
  return { fee: flatFee, isCharged: true };
}
/**
 * Default platform service fee rate (whole-number %).
 * This mirrors the `payments.platformServiceFeeRate` AppSetting default.
 * Used by client-side UI components that cannot call async server-side helpers.
 */
export const DEFAULT_PLATFORM_SERVICE_FEE_RATE_PERCENT = 5;

/** Bank names treated as GCash / e-wallet (use the lower fee tier). */
const GCASH_BANKS = new Set(["GCash", "Maya (PayMaya)", "Maya", "PayMaya"]);

export interface WithdrawalFeeBreakdown {
  /** Amount the provider requested (gross) */
  requestedAmount: number;
  /** Flat fee deducted from the gross amount */
  withdrawalFee: number;
  /** Amount the provider actually receives = requestedAmount − withdrawalFee */
  netAmount: number;
}

/**
 * Calculate the withdrawal fee for a provider payout.
 * GCash / Maya payouts use the lower fee; all other banks use the bank fee.
 *
 * @param requestedAmount - Gross amount the provider wants to withdraw
 * @param bankName        - Selected bank / payment channel from the payout form
 * @param bankFee         - Flat fee for standard bank transfers (PHP, from AppSettings)
 * @param gcashFee        - Flat fee for GCash / Maya payouts (PHP, from AppSettings)
 */
export function calculateWithdrawalFee(
  requestedAmount: number,
  bankName: string,
  bankFee = DEFAULT_WITHDRAWAL_FEE_BANK,
  gcashFee = DEFAULT_WITHDRAWAL_FEE_GCASH
): WithdrawalFeeBreakdown {
  const withdrawalFee = GCASH_BANKS.has(bankName) ? gcashFee : bankFee;
  const netAmount = Math.round((requestedAmount - withdrawalFee) * 100) / 100;
  return { requestedAmount, withdrawalFee, netAmount };
}
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
  if (category && HIGH_VALUE_CATEGORIES.has(category.trim())) return HIGH_COMMISSION_RATE;
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

export interface EscrowFeeBreakdown {
  /** Original service price (job budget), before any platform fees */
  serviceAmount: number;
  /** Non-refundable escrow protection fee charged to the client */
  escrowFee: number;
  /** Total charged to the client at checkout (serviceAmount + escrowFee) */
  totalCharge: number;
  /** Decimal rate used, e.g. 0.02 for 2% */
  rate: number;
}

/**
 * Calculate the escrow service fee charged to the client.
 * @param serviceAmount - Job budget / service price in PHP
 * @param ratePercent   - Whole-number percentage, e.g. 2 for 2% (from AppSettings)
 */
export function calculateEscrowFee(
  serviceAmount: number,
  ratePercent: number
): EscrowFeeBreakdown {
  const rate = ratePercent / 100;
  const escrowFee = Math.round(serviceAmount * rate * 100) / 100;
  const totalCharge = Math.round((serviceAmount + escrowFee) * 100) / 100;
  return { serviceAmount, escrowFee, totalCharge, rate };
}

export interface ClientFeeBreakdown {
  /** Original service price (job budget) */
  serviceAmount: number;
  /** Non-refundable escrow protection fee */
  escrowFee: number;
  escrowFeeRate: number;
  /** Non-refundable payment processing fee */
  processingFee: number;
  processingFeeRate: number;
  /** Flat urgent booking fee (₱0 for standard bookings) */
  urgencyFee: number;
  /** Non-refundable client-side platform service fee (percentage of service amount) */
  platformServiceFee: number;
  platformServiceFeeRate: number;
  /** Total charged to the client at checkout = serviceAmount + escrowFee + processingFee + urgencyFee + platformServiceFee */
  totalCharge: number;
}

/**
 * Compute all client-side fees and the grand total charged at checkout.
 * Both percentage fees are calculated against the base service amount (not compounded).
 * The urgencyFee is a flat amount added to the total.
 *
 * @param serviceAmount                 - Job budget / service price in PHP
 * @param escrowFeeRatePercent          - Whole-number %, e.g. 2
 * @param processingFeeRatePercent      - Whole-number %, e.g. 2
 * @param urgencyFee                    - Flat urgent booking fee in PHP (default ₱0 for standard)
 * @param platformServiceFeeRatePercent - Whole-number %, e.g. 5 (default 0 — opt-in per deployment)
 */
export function calculateClientFees(
  serviceAmount: number,
  escrowFeeRatePercent: number,
  processingFeeRatePercent: number,
  urgencyFee = 0,
  platformServiceFeeRatePercent = 0
): ClientFeeBreakdown {
  const escrowFee          = Math.round(serviceAmount * (escrowFeeRatePercent          / 100) * 100) / 100;
  const processingFee      = Math.round(serviceAmount * (processingFeeRatePercent      / 100) * 100) / 100;
  const platformServiceFee = Math.round(serviceAmount * (platformServiceFeeRatePercent / 100) * 100) / 100;
  const totalCharge        = Math.round((serviceAmount + escrowFee + processingFee + urgencyFee + platformServiceFee) * 100) / 100;
  return {
    serviceAmount,
    escrowFee,
    escrowFeeRate:          escrowFeeRatePercent          / 100,
    processingFee,
    processingFeeRate:      processingFeeRatePercent      / 100,
    urgencyFee,
    platformServiceFee,
    platformServiceFeeRate: platformServiceFeeRatePercent / 100,
    totalCharge,
  };
}

// ─── Cancellation Fee ───────────────────────────────────────────────────────

/** The tier that determined the cancellation fee. */
export type CancellationFeeTier = "free" | "flat" | "percent" | "no_schedule";

export interface CancellationFeeBreakdown {
  /** Cancellation fee charged to the client and deducted from their escrow refund (PHP). */
  fee: number;
  /** Provider receives 50% of the fee as compensation (PHP). */
  providerShare: number;
  /** Platform keeps 50% of the fee as revenue (PHP). */
  platformShare: number;
  /** The pricing tier that was applied. */
  tier: CancellationFeeTier;
  /** Hours until the scheduled service at the time of cancellation (null when no scheduleDate). */
  hoursUntilService: number | null;
}

/**
 * Calculate the tiered cancellation fee based on how far in advance the client cancels.
 *
 * Tiers (all thresholds and amounts are configurable via AppSettings):
 *   >= freeHours   → ₱0 (free)
 *   >= percentHours, < freeHours → flat fee (default ₱100)
 *   <  percentHours              → percentage of budget (default 20%)
 *
 * Returns a zero-fee breakdown when:
 *   - scheduleDate is null / undefined (no schedule set)
 *   - The service is already in the past (hoursUntil <= 0 still applies the percent tier)
 *
 * @param budget               - Job service price in PHP
 * @param scheduleDate         - The scheduled service datetime (or null)
 * @param freeWindowHours      - Hours before service where cancellation is still free (default 24)
 * @param flatWindowHours      - Hours threshold for the flat fee tier (default 12)
 * @param percentWindowHours   - Hours threshold for the percentage fee tier (default 1)
 * @param flatFee              - Flat cancellation fee in PHP (default ₱100)
 * @param percentRate          - Whole-number percentage for the percent tier (default 20)
 */
export function calculateCancellationFee(
  budget: number,
  scheduleDate: Date | null | undefined,
  freeWindowHours     = DEFAULT_CANCELLATION_WINDOW_FREE_HOURS,
  flatWindowHours     = DEFAULT_CANCELLATION_WINDOW_FLAT_HOURS,
  percentWindowHours  = DEFAULT_CANCELLATION_WINDOW_PERCENT_HOURS,
  flatFee             = DEFAULT_CANCELLATION_FEE_FLAT,
  percentRate         = DEFAULT_CANCELLATION_FEE_PERCENT
): CancellationFeeBreakdown {
  if (!scheduleDate) {
    return { fee: 0, providerShare: 0, platformShare: 0, tier: "no_schedule", hoursUntilService: null };
  }

  const hoursUntilService = (scheduleDate.getTime() - Date.now()) / (1000 * 60 * 60);

  let fee: number;
  let tier: CancellationFeeTier;

  if (hoursUntilService >= freeWindowHours) {
    fee  = 0;
    tier = "free";
  } else if (hoursUntilService >= percentWindowHours) {
    // Between percentWindowHours and freeWindowHours → flat fee
    // Note: flatWindowHours is the label on the table (12h) but the range is (percentHours, freeHours)
    fee  = flatFee;
    tier = "flat";
  } else {
    // Within percentWindowHours (e.g. < 1 hour) → percentage of budget
    fee  = Math.round(budget * (percentRate / 100) * 100) / 100;
    tier = "percent";
  }

  const providerShare = Math.round(fee * 0.5 * 100) / 100;
  const platformShare = Math.round((fee - providerShare) * 100) / 100;

  return { fee, providerShare, platformShare, tier, hoursUntilService };
}

