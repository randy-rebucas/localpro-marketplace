import { NextRequest, NextResponse } from "next/server";
import { jobService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

import { checkRateLimit } from "@/lib/rateLimit";
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_jobs");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const result = await jobService.listJobs(user, {
    status: searchParams.get("status") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    page:  Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1),
    limit: Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20),
  });

  return NextResponse.json(result);
});
