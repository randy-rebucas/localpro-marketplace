import type { BusinessPlan } from "@/types";

// ─── Location limits per plan ─────────────────────────────────────────────────

export const LOCATION_LIMITS: Record<BusinessPlan, number> = {
  starter:    2,
  growth:     5,
  pro:        15,
  enterprise: Infinity,
};

export const PLAN_LABELS: Record<BusinessPlan, string> = {
  starter:    "Free",
  growth:     "Growth",
  pro:        "Pro",
  enterprise: "Enterprise",
};

export const PLAN_UPGRADE_NEXT: Partial<Record<BusinessPlan, BusinessPlan>> = {
  starter: "growth",
  growth:  "pro",
  pro:     "enterprise",
};

// ─── Member limits per plan ──────────────────────────────────────────────────

export const MEMBER_LIMITS: Record<BusinessPlan, number> = {
  starter:    5,
  growth:     15,
  pro:        50,
  enterprise: Infinity,
};

/** Return the maximum number of locations allowed for a given plan. */
export function getLocationLimit(plan: BusinessPlan): number {
  return LOCATION_LIMITS[plan];
}

/** True when the org has reached (or exceeded) its location quota. */
export function isAtLocationLimit(plan: BusinessPlan, currentCount: number): boolean {
  const limit = LOCATION_LIMITS[plan];
  return limit !== Infinity && currentCount >= limit;
}

/** Return the maximum number of members allowed for a given plan. */
export function getMemberLimit(plan: BusinessPlan): number {
  return MEMBER_LIMITS[plan];
}

/** True when the org has reached (or exceeded) its member quota. */
export function isAtMemberLimit(plan: BusinessPlan, currentCount: number): boolean {
  const limit = MEMBER_LIMITS[plan];
  return limit !== Infinity && currentCount >= limit;
}

// ─── Monthly job limits per plan ────────────────────────────────────────────

export const JOB_LIMITS: Record<BusinessPlan, number> = {
  starter:    10,
  growth:     50,
  pro:        Infinity,
  enterprise: Infinity,
};

/** Return the maximum number of jobs per month for a given plan. */
export function getJobLimit(plan: BusinessPlan): number {
  return JOB_LIMITS[plan];
}

/** True when the org has reached (or exceeded) its monthly job quota. */
export function isAtJobLimit(plan: BusinessPlan, monthlyCount: number): boolean {
  const limit = JOB_LIMITS[plan];
  return limit !== Infinity && monthlyCount >= limit;
}

// ─── Feature gates ─────────────────────────────────────────────────────────────

/** Plans that include access to Business Analytics (AI Insights, expense reports, provider performance). */
const ANALYTICS_PLANS: BusinessPlan[] = ["growth", "pro", "enterprise"];

/** True when the plan unlocks analytics features. */
export function hasAnalyticsAccess(plan: BusinessPlan): boolean {
  return ANALYTICS_PLANS.includes(plan);
}

/** Plans that include Bulk CSV Upload and Recurring Job Scheduler. */
const BULK_RECURRING_PLANS: BusinessPlan[] = ["pro", "enterprise"];

/** True when the plan unlocks bulk CSV upload and recurring job scheduling. */
export function hasBulkAndRecurringAccess(plan: BusinessPlan): boolean {
  return BULK_RECURRING_PLANS.includes(plan);
}

/** Plans that include Priority Support (dedicated account manager, 4-hour SLA). */
const PRIORITY_SUPPORT_PLANS: BusinessPlan[] = ["enterprise"];

/** True when the plan unlocks Priority Support. */
export function hasPrioritySupportAccess(plan: BusinessPlan): boolean {
  return PRIORITY_SUPPORT_PLANS.includes(plan);
}

// ─── Commission rates per plan ────────────────────────────────────────────────

/**
 * Discounted platform commission rates for business plan tiers.
 * These replace the standard category-based rate for business clients.
 */
export const BUSINESS_COMMISSION_RATES: Record<BusinessPlan, number> = {
  starter:    0.15,
  growth:     0.12,
  pro:        0.10,
  enterprise: 0.08,
};

/** Return the commission rate decimal for a given business plan. */
export function getBusinessCommissionRate(plan: BusinessPlan): number {
  return BUSINESS_COMMISSION_RATES[plan];
}
