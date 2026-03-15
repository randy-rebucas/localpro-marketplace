/**
 * Distributed sliding-window rate limiter backed by Upstash Redis.
 *
 * Requires the following environment variables:
 *   UPSTASH_REDIS_REST_URL   — Upstash Redis REST API URL
 *   UPSTASH_REDIS_REST_TOKEN — Upstash Redis REST API token
 *
 * Falls back to an in-memory limiter when those variables are absent
 * (e.g. local development without an Upstash account).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

// ─── Redis client ─────────────────────────────────────────────────────────────

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis
  ? new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// ─── Limiter cache ────────────────────────────────────────────────────────────
// We cache one Ratelimit instance per (max, windowMs) combination so that the
// underlying Redis scripts are only registered once.

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(max: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${max}:${windowMs}`;
  if (!limiterCache.has(cacheKey)) {
    const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
    // Express the window as "Xs" or "Xm" — Upstash accepts "s" and "m" units
    const windowStr =
      windowSeconds >= 60
        ? `${Math.floor(windowSeconds / 60)} m`
        : `${windowSeconds} s`;
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, windowStr as `${number} ${"s" | "m" | "h" | "d"}`),
        analytics: false,
      })
    );
  }
  return limiterCache.get(cacheKey)!;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface FallbackRecord {
  count: number;
  resetAt: number;
}

const fallbackStore = new Map<string, FallbackRecord>();
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, r] of fallbackStore) {
    if (r.resetAt < now) fallbackStore.delete(k);
  }
}, 5 * 60 * 1000);
if (typeof pruneTimer === "object" && pruneTimer !== null && "unref" in pruneTimer) {
  (pruneTimer as { unref(): void }).unref();
}

function checkFallback(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const rec = fallbackStore.get(key);
  if (!rec || rec.resetAt < now) {
    const resetAt = now + options.windowMs;
    fallbackStore.set(key, { count: 1, resetAt });
    return { ok: true, remaining: options.max - 1, resetAt };
  }
  rec.count++;
  const remaining = Math.max(0, options.max - rec.count);
  return { ok: rec.count <= options.max, remaining, resetAt: rec.resetAt };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RateLimitCheckOptions {
  /**
   * When true (default), a Redis failure degrades to the in-memory fallback.
   * Set to false on high-sensitivity endpoints (login, register, password reset)
   * so that a Redis outage never silently allows unlimited requests.
   */
  failOpen?: boolean;
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  { failOpen = true }: RateLimitCheckOptions = {}
): Promise<RateLimitResult> {
  const limiter = getLimiter(options.max, options.windowMs);

  if (!limiter) {
    // No Redis credentials — use in-memory fallback (dev only)
    return checkFallback(key, options);
  }

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { ok: success, remaining, resetAt: reset };
  } catch (err) {
    console.error("[RateLimit] Redis error:", err);
    if (!failOpen) {
      // Hard-fail: treat Redis unavailability as rate-limited on sensitive routes
      return { ok: false, remaining: 0, resetAt: Date.now() + options.windowMs };
    }
    // Degrade gracefully for non-sensitive routes
    return checkFallback(key, options);
  }
}
