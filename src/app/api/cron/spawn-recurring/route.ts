import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";
import { acquireCronLock, releaseCronLock } from "@/lib/cronLock";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // L15: Distributed lock — prevent duplicate recurring-job spawning across concurrent instances
  const lockId = await acquireCronLock("spawn-recurring");
  if (!lockId) {
    return Response.json({ ok: false, reason: "lock_held" }, { status: 200 });
  }

  try {
    const result = await cronService.spawnRecurringJobs();
    return Response.json({ ok: true, ...result });
  } finally {
    await releaseCronLock("spawn-recurring", lockId);
  }
}
