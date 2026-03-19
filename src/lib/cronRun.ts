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
import { createLogger } from "@/lib/logger";

const log = createLogger("cronRun");

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

  // Resolve the route name from the DB record for the alert email
  let route = "unknown";
  try {
    const run = await CronRun.findById(id).lean();
    if (run?.route) route = run.route;
  } catch {
    // best-effort
  }

  // Fire-and-forget alert to admin
  const adminEmail = process.env.ADMIN_SUPPORT_EMAIL;
  if (adminEmail) {
    import("@/lib/email")
      .then(({ sendEmail }) =>
        sendEmail(
          adminEmail,
          `[CRON ALERT] ${route} failed`,
          `<h2>Cron Failure Alert</h2>
           <p><strong>Route:</strong> ${route}</p>
           <p><strong>Error:</strong> ${errorMsg}</p>
           <p><strong>Timestamp:</strong> ${finishedAt.toISOString()}</p>`,
        ),
      )
      .catch((alertErr) => {
        log.error({ err: alertErr, route }, "Failed to send cron failure alert email");
      });
  }
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
