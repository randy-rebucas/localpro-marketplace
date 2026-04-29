import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";

/** GET /api/business/jobs?orgId=xxx[&locationId=&status=&category=&providerId=&dateFrom=&dateTo=&page=&limit=] */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-jobs-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const sp = new URL(req.url).searchParams;
  const orgId = sp.get("orgId");
  if (!orgId) throw new ValidationError("orgId query param required.");

  const result = await businessService.listBusinessJobs(orgId, user.userId, {
    locationId:  sp.get("locationId")  ?? undefined,
    status:      sp.get("status")      ?? undefined,
    category:    sp.get("category")    ?? undefined,
    providerId:  sp.get("providerId")  ?? undefined,
    dateFrom:    sp.get("dateFrom")    ?? undefined,
    dateTo:      sp.get("dateTo")      ?? undefined,
    page:        sp.get("page")   ? parseInt(sp.get("page")!,  10) : 1,
    limit: Math.min(50, sp.get("limit") ? parseInt(sp.get("limit")!, 10) : 20),
  });

  return NextResponse.json(result);
});
