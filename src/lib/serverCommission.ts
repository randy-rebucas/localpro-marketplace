/**
 * Server-only commission helpers that read rates from the database.
 * Do NOT import this file from client components — use the pure helpers
 * in commission.ts (calculateCommission, getCommissionRate) instead.
 */
import { getAppSettings } from "@/lib/appSettings";
import { HIGH_VALUE_CATEGORIES } from "@/lib/commission";

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
  if (category && HIGH_VALUE_CATEGORIES.has(category)) return highRate;
  return baseRate;
}
