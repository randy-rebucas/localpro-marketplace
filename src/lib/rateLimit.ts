/**
 * In-memory sliding window rate limiter.
 * For multi-instance production, swap the Map for a Redis adapter.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Prune expired entries every 5 minutes
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);
// Allow the Node.js process to exit even if this timer is still pending
if (typeof pruneTimer === "object" && pruneTimer !== null && "unref" in pruneTimer) {
  (pruneTimer as { unref(): void }).unref();
}

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

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: options.max - 1, resetAt };
  }

  existing.count++;
  const remaining = Math.max(0, options.max - existing.count);
  return { ok: existing.count <= options.max, remaining, resetAt: existing.resetAt };
}
