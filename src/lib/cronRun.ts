/**
 * Cron run tracking helpers.
 *
 * Usage in a cron handler:
 *
 *   const run = await startCronRun("/api/cron/expire-jobs");
 *   try {
 *     const count = await cronService.expireStaleJobs();
 *     await finishCronRun(run._id.toString(), { itemsProcessed: count });
 *   } catch (err) {
 *     await failCronRun(run._id.toString(), err);
 *   }
 */

import { connectDB } from "@/lib/db";
import CronRun, { type ICronRun } from "@/models/CronRun";

export async function startCronRun(route: string): Promise<ICronRun> {
  await connectDB();
  return CronRun.create({ route, status: "running", startedAt: new Date() });
}

export async function finishCronRun(
  id: string,
  opts: { itemsProcessed?: number; meta?: Record<string, unknown> } = {}
): Promise<void> {
  const finishedAt = new Date();
  await CronRun.findByIdAndUpdate(id, {
    $set: {
      status:         "completed",
      finishedAt,
      itemsProcessed: opts.itemsProcessed ?? 0,
      meta:           opts.meta,
    },
  });
}

export async function failCronRun(id: string, err: unknown): Promise<void> {
  const finishedAt = new Date();
  const errorMsg   = err instanceof Error ? err.message : String(err);
  await CronRun.findByIdAndUpdate(id, {
    $set: {
      status:      "failed",
      finishedAt,
      error:       errorMsg,
    },
  });
}

export async function skipCronRun(id: string, reason?: string): Promise<void> {
  const finishedAt = new Date();
  await CronRun.findByIdAndUpdate(id, {
    $set: {
      status:      "skipped",
      finishedAt,
      error:       reason,
    },
  });
}
