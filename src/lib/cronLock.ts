/**
 * Distributed cron lock utility (L15).
 *
 * Uses MongoDB as a single source of truth so that concurrent serverless
 * function invocations (e.g., multiple Vercel replicas) do not execute the
 * same cron job simultaneously.
 *
 * Usage:
 *   const lockId = await acquireCronLock("spawn-recurring");
 *   if (!lockId) return Response.json({ ok: false, reason: "lock_held" });
 *   try {
 *     await doWork();
 *   } finally {
 *     await releaseCronLock("spawn-recurring", lockId);
 *   }
 */
import { randomUUID } from "crypto";
import CronLock from "@/models/CronLock";

/** Default lock TTL in milliseconds (5 minutes). */
const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Attempt to acquire the named cron lock.
 *
 * @param name    - Unique cron job identifier (e.g., "spawn-recurring").
 * @param ttlMs   - Lock time-to-live in ms. Stale locks older than ttlMs are removed.
 * @returns       A unique lockId string if the lock was acquired, or `null` if
 *                another instance already holds it.
 */
export async function acquireCronLock(
  name: string,
  ttlMs: number = DEFAULT_LOCK_TTL_MS
): Promise<string | null> {
  const lockId   = randomUUID();
  const now      = new Date();
  const expiry   = new Date(now.getTime() - ttlMs); // locks older than ttlMs are considered stale

  try {
    // Atomically claim the lock if:
    //   (a) no lock document exists for this name, OR
    //   (b) the existing lock has expired (lockedAt < expiry)
    const result = await CronLock.findOneAndUpdate(
      {
        name,
        $or: [
          // No existing document — upsert will insert one
          { lockedAt: { $lt: expiry } },
        ],
      },
      { $set: { name, lockedAt: now, lockedBy: lockId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Confirm we own the lock (lockedBy matches our lockId)
    return result?.lockedBy === lockId ? lockId : null;
  } catch (err: unknown) {
    // Duplicate-key error means another instance just inserted the lock
    if ((err as { code?: number }).code === 11000) {
      return null;
    }
    // Check if the existing lock is still fresh (held by someone else)
    const existing = await CronLock.findOne({ name }).lean();
    if (existing && existing.lockedAt > expiry) {
      return null; // Lock is actively held
    }
    throw err;
  }
}

/**
 * Release a previously acquired cron lock.
 * Only releases if `lockedBy` still matches `lockId` (prevents stale releases).
 */
export async function releaseCronLock(name: string, lockId: string): Promise<void> {
  await CronLock.deleteOne({ name, lockedBy: lockId });
}
