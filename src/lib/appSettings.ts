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
  });
}

export async function getLimitSettings() {
  return getAppSettings({
    "limits.maxQuotesPerJob": 5 as number,
    "limits.quoteValidityDays": 7 as number,
    "limits.maxActiveJobsPerClient": 10 as number,
  });
}
