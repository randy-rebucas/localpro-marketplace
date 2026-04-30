/**
 * Redis-backed event bus for Server-Sent Events (SSE) scaling.
 *
 * Uses Upstash Redis Streams (XADD / XREAD) to distribute events across
 * multiple Vercel Function instances. Falls back to in-process EventEmitter
 * when Redis is unavailable.
 *
 * Each channel maps to a Redis Stream key: `sse:{channel}`.
 * - emit()  -> XADD with MAXLEN ~1000 to cap memory
 * - on()    -> Polls XREAD every 1.5s for new entries since subscription
 * - off()   -> Stops the polling interval for that handler
 */

import { EventEmitter } from "events";
import { getRedis } from "./redis";

type Handler = (...args: unknown[]) => void;

interface Subscription {
  interval: ReturnType<typeof setInterval>;
  lastId: string;
}

const STREAM_PREFIX = "sse:";
const MAX_STREAM_LEN = 1000;
const POLL_INTERVAL_MS = 1500;

export class RedisBus extends EventEmitter {
  /** Maps handler -> active polling subscription */
  private subs = new Map<Handler, Subscription>();

  constructor() {
    super();
    this.setMaxListeners(10_000);
  }

  /* ------------------------------------------------------------------ */
  /*  emit – publish to Redis Stream AND fire locally                    */
  /* ------------------------------------------------------------------ */

  emit(channel: string, ...args: unknown[]): boolean {
    const redis = getRedis();
    if (redis) {
      // Redis mode: publish only to the stream. All instances (including this
      // one) will receive the event via their polling intervals, preventing the
      // double-delivery that would occur if we also fired locally here.
      this.redisPublish(channel, args[0]).catch((err) => {
        console.error(`[RedisBus] XADD failed for ${channel}:`, err);
      });
      return this.listenerCount(channel) > 0;
    }

    // No Redis — fall back to in-process delivery only.
    return super.emit(channel, ...args);
  }

  /* ------------------------------------------------------------------ */
  /*  on – subscribe locally AND start polling Redis                     */
  /* ------------------------------------------------------------------ */

  on(channel: string, handler: Handler): this {
    super.on(channel, handler);
    this.startPolling(channel, handler);
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  off – unsubscribe locally AND stop Redis polling                   */
  /* ------------------------------------------------------------------ */

  off(channel: string, handler: Handler): this {
    super.off(channel, handler);
    this.stopPolling(handler);
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  removeListener (alias used by some callers)                       */
  /* ------------------------------------------------------------------ */

  removeListener(channel: string, handler: Handler): this {
    return this.off(channel, handler);
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private async redisPublish(channel: string, data: unknown): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const streamKey = `${STREAM_PREFIX}${channel}`;
    await redis.xadd(streamKey, "*", { data: JSON.stringify(data ?? null) }, {
      trim: { type: "MAXLEN", comparison: "~", threshold: MAX_STREAM_LEN },
    });
  }

  private startPolling(channel: string, handler: Handler): void {
    const redis = getRedis();
    if (!redis) return; // no Redis => rely on in-process only

    // Use "$" as the initial ID so we only see messages arriving *after* subscribe
    const sub: Subscription = { interval: undefined as never, lastId: "$" };

    const poll = async () => {
      try {
        const redis = getRedis();
        if (!redis) return;

        const streamKey = `${STREAM_PREFIX}${channel}`;

        // XREAD returns raw arrays: [[streamName, [[id, [field, val, ...]], ...]], ...]
        // or null / empty array when there are no new entries.
        const results: unknown[] | null = await redis.xread(
          streamKey,
          sub.lastId,
          { count: 50 },
        );

        if (!results || !Array.isArray(results) || results.length === 0) return;

        // results is [[streamName, entries], ...]
        for (const streamEntry of results as [string, [string, string[]][]][]) {
          const entries = streamEntry[1];
          if (!Array.isArray(entries)) continue;

          for (const entry of entries) {
            const entryId = entry[0] as string;
            const fields = entry[1] as string[];
            if (entryId) sub.lastId = entryId;

            // fields is [field1, val1, field2, val2, ...]
            // We stored { data: "<json>" }, so find the "data" field
            const dataValue = extractField(fields, "data");
            if (dataValue === undefined) continue;

            try {
              const parsed = JSON.parse(dataValue);
              // Deliver via the handler directly (NOT via super.emit, which
              // would double-fire for local callers that already got the
              // in-process emit).
              handler(parsed);
            } catch {
              // Malformed entry — skip
            }
          }
        }
      } catch (err) {
        console.error(`[RedisBus] XREAD poll error for ${channel}:`, err);
      }
    };

    sub.interval = setInterval(poll, POLL_INTERVAL_MS);
    this.subs.set(handler, sub);
  }

  private stopPolling(handler: Handler): void {
    const sub = this.subs.get(handler);
    if (sub) {
      clearInterval(sub.interval);
      this.subs.delete(handler);
    }
  }
}

/**
 * Extract a field value from a flat [key, val, key, val, ...] array.
 * Upstash may return this as a flat string array or already-parsed structures.
 */
function extractField(fields: unknown, fieldName: string): string | undefined {
  if (!Array.isArray(fields)) return undefined;
  for (let i = 0; i < fields.length - 1; i += 2) {
    if (fields[i] === fieldName) return String(fields[i + 1]);
  }
  return undefined;
}
