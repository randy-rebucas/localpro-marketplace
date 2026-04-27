import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";
import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";
import { hasAnalyticsAccess } from "@/lib/businessPlan";

/** GET /api/business/analytics/budget-alerts?orgId=xxx */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-budget-alerts:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId query param required.");

  const org = await businessOrganizationRepository.findOrgById(orgId);
  if (!org || !hasAnalyticsAccess(org.plan)) {
    throw new ForbiddenError("Analytics is not available on the Free plan. Upgrade to Growth or higher.");
  }

  const alerts = await businessService.getBudgetAlerts(orgId, user.userId);
  return NextResponse.json({ alerts });
});
