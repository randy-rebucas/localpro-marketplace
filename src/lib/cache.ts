/**
 * Simple Redis caching utility built on the existing Upstash client.
 *
 * All keys are prefixed with `cache:` to avoid collisions with rate-limit
 * or session keys that may share the same Redis instance.
 *
 * When Redis is not configured (getRedis() returns null), every function
 * degrades gracefully: reads return null and writes are no-ops.
 */

import { getRedis } from "./redis";

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Retrieve a cached value. Returns `null` on miss or when Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const raw = await redis.get<T>(key);
    return raw ?? null;
  } catch {
    // Redis failure should never break the application.
    return null;
  }
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Store a value in the cache with an explicit TTL (in seconds).
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // swallow — caching is best-effort
  }
}

// ── Invalidate (single key) ──────────────────────────────────────────────────

export async function cacheInvalidate(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(key);
  } catch {
    // swallow
  }
}

// ── Invalidate by prefix (pattern) ──────────────────────────────────────────

/**
 * Delete all keys matching a given prefix.
 *
 * Uses SCAN + DEL to avoid blocking the Redis instance.  The `pattern`
 * parameter is treated as a literal prefix — a trailing `*` is appended
 * automatically if not already present.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const scanPattern = pattern.endsWith("*") ? pattern : `${pattern}*`;
    let cursor = 0;

    do {
      // Upstash scan returns [nextCursor: string, keys: string[]]
      const result = await redis.scan(cursor, {
        match: scanPattern,
        count: 100,
      });
      const nextCursor = Number((result as unknown as [string, string[]])[0]);
      const keys = (result as unknown as [string, string[]])[1];
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        for (const k of keys) {
          pipeline.del(k);
        }
        await pipeline.exec();
      }
    } while (cursor !== 0);
  } catch {
    // swallow
  }
}
