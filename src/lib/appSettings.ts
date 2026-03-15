/**
 * Lightweight helpers for reading app-level settings from the database.
 * Used to enforce platform-wide rules (e.g. maintenance mode, limits, min amounts).
 *
 * Each helper fetches only the keys it needs via findByKeys (single indexed query).
 * Falls back to sensible defaults when a key has never been saved.
 */

import { appSettingRepository } from "@/repositories";

/** Read one setting from the DB, returning `defaultValue` if absent. */
export async function getAppSetting<T>(key: string, defaultValue: T): Promise<T> {
  const map = await appSettingRepository.findByKeys([key]);
  return key in map ? (map[key] as T) : defaultValue;
}

/** Read several settings in one DB round-trip, merging with provided defaults. */
export async function getAppSettings<T extends Record<string, unknown>>(
  defaults: T
): Promise<T> {
  const keys = Object.keys(defaults);
  const map = await appSettingRepository.findByKeys(keys);
  return { ...defaults, ...map } as T;
}

// ─── Typed shortcuts ──────────────────────────────────────────────────────────

export async function getPlatformSettings() {
  return getAppSettings({
    "platform.maintenanceMode": false as boolean,
    "platform.newRegistrations": true as boolean,
    "platform.kycRequired": false as boolean,
  });
}

export async function getPaymentSettings() {
  return getAppSettings({
    "payments.baseCommissionRate": 15 as number,
    "payments.highCommissionRate": 20 as number,
    "payments.minJobBudget": 500 as number,
    "payments.minPayoutAmount": 100 as number,
    /** Escrow service fee charged to the client on top of the service price (whole-number %). Default: 2. */
    "payments.escrowServiceFeeRate": 2 as number,
    /** Payment processing fee passed to the client to cover gateway costs (whole-number %). Default: 2. */
    "payments.processingFeeRate": 2 as number,
    /** Flat withdrawal fee for bank transfer payouts (PHP). Default: ₱20. */
    "payments.withdrawalFeeBank": 20 as number,
    /** Flat withdrawal fee for GCash / Maya payouts (PHP). Default: ₱15. */
    "payments.withdrawalFeeGcash": 15 as number,
    /** Flat urgent booking fee for same-day service (PHP). Default: ₱50. */
    "payments.urgencyFeeSameDay": 50 as number,
    /** Flat urgent booking fee for 2-hour rush service (PHP). Default: ₱100. */
    "payments.urgencyFeeRush": 100 as number,
    /** Client-side platform service fee charged on top of the service price (whole-number %). Default: 5%. */
    "payments.platformServiceFeeRate": 5 as number,    /** Featured listing boost price for 'Featured Provider' placement (PHP/week). Default: ₱199. */
    "payments.featuredListingFeaturedProvider": 199 as number,
    /** Featured listing boost price for 'Top Search Placement' (PHP/week). Default: ₱299. */
    "payments.featuredListingTopSearch": 299 as number,
    /** Featured listing boost price for 'Homepage Highlight' (PHP/week). Default: ₱499. */
    "payments.featuredListingHomepage": 499 as number,
    /** Whether the lead fee system is enabled. When false, providers can quote for free. Default: false. */
    "payments.leadFeeEnabled": false as boolean,
    /** Active lead fee mode: pay_per_lead | bid_credits | subscription. Default: pay_per_lead. */
    "payments.leadFeeMode": "pay_per_lead" as string,
    /** Fee charged per quote submitted when mode is pay_per_lead (PHP). Default: ₱30. */
    "payments.leadFeePayPerLead": 30 as number,
    /** Price of one bid credit token (PHP). Pack pricing scales from this. Default: ₱10. */
    "payments.leadFeeBidCreditPrice": 10 as number,
    /** Monthly subscription price for unlimited leads (PHP). Default: ₱499. */
    "payments.leadFeeSubscriptionMonthly": 499 as number,
    /** Hours before scheduleDate within which cancellation is free. Default: 24 hours. */
    "payments.cancellationWindowFreeHours": 24 as number,
    /** Hours before scheduleDate for the flat cancellation fee tier. Default: 12 hours. */
    "payments.cancellationWindowFlatHours": 12 as number,
    /** Hours before scheduleDate for the percentage cancellation fee tier. Default: 1 hour. */
    "payments.cancellationWindowPercentHours": 1 as number,
    /** Flat cancellation fee charged when cancelling between 1h–12h before service (PHP). Default: ₱100. */
    "payments.cancellationFeeFlat": 100 as number,
    /** Percentage of job budget charged when cancelling within 1h of service (whole-number %). Default: 20%. */
    "payments.cancellationFeePercent": 20 as number,
    /** Flat case handling fee charged to the losing party when a dispute escalates to investigation (PHP). Default: ₱100. */
    "payments.disputeHandlingFee": 100 as number,
    /** Whether the training / upskilling course system is enabled for providers. Default: false. */
    "payments.trainingEnabled": false as boolean,
  });
}

export async function getLimitSettings() {
  return getAppSettings({
    "limits.maxQuotesPerJob": 5 as number,
    "limits.quoteValidityDays": 7 as number,
    "limits.maxActiveJobsPerClient": 10 as number,
  });
}

export async function getReferralSettings() {
  return getAppSettings({
    /** Points awarded to the referrer when their referee completes a first job. Default: 200. */
    "referral.referrerBonusPoints": 200 as number,
    /** Points awarded to the referee (new user) who was referred. Default: 100. */
    "referral.refereeBonusPoints": 100 as number,
    /** Whether the referral program is active. Default: true. */
    "referral.enabled": true as boolean,
  });
}

export async function getLoyaltySettings() {
  return getAppSettings({
    /** Loyalty points earned per ₱100 of job spend (clients). Default: 10. */
    "loyalty.pointsPerHundredPeso": 10 as number,
    /** Minimum points required for a redemption. Default: 500. */
    "loyalty.minRedemptionPoints": 500 as number,
    /** Peso credit value per 100 points redeemed. Default: ₱10. */
    "loyalty.pesoPerHundredPoints": 10 as number,
    /** Points awarded on first job posted (clients). Default: 50. */
    "loyalty.firstJobBonusPoints": 50 as number,
    /** Points awarded for writing a review. Default: 50. */
    "loyalty.reviewBonusPoints": 50 as number,
  });
}
