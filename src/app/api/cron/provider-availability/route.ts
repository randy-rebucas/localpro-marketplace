import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";

/**
 * Daily provider-availability cron:
 * Resets `availabilityStatus` from "busy" → "available" for providers who
 * have no active (assigned / in_progress) jobs at the time of execution.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const result = await cronService.resetProviderAvailability();
  return Response.json({ ok: true, ...result });
}
