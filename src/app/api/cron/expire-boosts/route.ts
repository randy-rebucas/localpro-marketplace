import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { featuredListingService } from "@/services/featured-listing.service";

/** GET /api/cron/expire-boosts — mark all stale featured listing boosts as expired */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const result = await featuredListingService.expireStale();
  return Response.json({ ok: true, ...result });
}
