/**
 * Server-only commission helpers that read rates from the database.
 * Do NOT import this file from client components — use the pure helpers
 * in commission.ts (calculateCommission, getCommissionRate) instead.
 */
import { getAppSettings } from "@/lib/appSettings";
import { HIGH_VALUE_CATEGORIES } from "@/lib/commission";
import { getBusinessCommissionRate } from "@/lib/businessPlan";
import { businessMemberRepository } from "@/repositories/businessMember.repository";
import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";
import type { BusinessPlan } from "@/types";

/**
 * Async version: reads base and high-value commission rates from app settings
 * (stored as whole-number percentages, e.g. 15 → 0.15).
 * Falls back to the hardcoded constants when DB values are absent.
 */
export async function getDbCommissionRate(category?: string | null): Promise<number> {
  const settings = await getAppSettings({
    "payments.baseCommissionRate": 15 as number,
    "payments.highCommissionRate": 20 as number,
  });
  const baseRate = (settings["payments.baseCommissionRate"] as number) / 100;
  const highRate = (settings["payments.highCommissionRate"] as number) / 100;
  if (category && HIGH_VALUE_CATEGORIES.has(category.trim())) return highRate;
  return baseRate;
}

/**
 * Client-aware commission rate resolver.
 *
 * If `clientId` belongs to a business org, returns the plan-tier rate
 * (starter 15% → growth 12% → pro 10% → enterprise 8%) which overrides
 * the standard category-based rate.
 *
 * Falls back to `getDbCommissionRate(category)` for regular clients.
 */
export async function getEffectiveCommissionRate(
  category?: string | null,
  clientId?: string | null
): Promise<number> {
  if (clientId) {
    try {
      const memberships = await businessMemberRepository.findByUser(clientId);
      if (memberships && memberships.length > 0) {
        const orgId = String(memberships[0].orgId);
        const org   = await businessOrganizationRepository.findOrgById(orgId);
        if (org) return getBusinessCommissionRate(org.plan as BusinessPlan);
      }
    } catch (err) { console.warn("[Commission] Could not resolve business plan rate; using category rate.", err); }
  }
  return getDbCommissionRate(category);
}
