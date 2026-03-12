import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";
import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";
import { hasAnalyticsAccess } from "@/lib/businessPlan";

/** GET /api/business/analytics/providers?orgId=xxx */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId query param required.");

  const org = await businessOrganizationRepository.findOrgById(orgId);
  if (!org || !hasAnalyticsAccess(org.plan)) {
    throw new ForbiddenError("Analytics is not available on the Free plan. Upgrade to Growth or higher.");
  }

  const rows = await businessService.getProviderPerformance(orgId, user.userId);
  return NextResponse.json({ rows });
});
