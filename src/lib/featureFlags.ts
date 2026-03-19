/**
 * Feature flag system backed by the AppSetting collection.
 *
 * All flag keys are prefixed with `ff_` (e.g. `ff_ai_ranking_default`).
 * Flags are cached in-memory for 60 seconds to avoid per-request DB hits.
 *
 * Usage:
 *   import { getFlag, setFlag } from "@/lib/featureFlags";
 *   const enabled = await getFlag("ff_dark_mode", false);
 *   await setFlag("ff_push_notifications", true);
 */

import { connectDB } from "@/lib/db";
import AppSetting from "@/models/AppSetting";

// ─── In-memory cache ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): boolean | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache(key: string, value: boolean): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Read a feature flag.
 * Returns the stored boolean, or `defaultValue` if the flag does not exist.
 */
export async function getFlag(key: string, defaultValue: boolean = false): Promise<boolean> {
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  await connectDB();
  const doc = await AppSetting.findOne({ key }).lean();
  const value = doc ? Boolean(doc.value) : defaultValue;
  setCache(key, value);
  return value;
}

/**
 * Create or update a feature flag.
 */
export async function setFlag(key: string, value: boolean): Promise<void> {
  await connectDB();
  await AppSetting.findOneAndUpdate(
    { key },
    { $set: { value } },
    { upsert: true },
  );
  setCache(key, value);
}

/**
 * Return all feature flags (keys starting with `ff_`).
 */
export async function getAllFlags(): Promise<Record<string, boolean>> {
  await connectDB();
  const docs = await AppSetting.find({ key: { $regex: /^ff_/ } }).lean();
  const flags: Record<string, boolean> = {};
  for (const doc of docs) {
    const value = Boolean(doc.value);
    flags[doc.key] = value;
    setCache(doc.key, value);
  }
  return flags;
}
