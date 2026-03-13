import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";
import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";
import { hasBulkAndRecurringAccess } from "@/lib/businessPlan";

/**
 * GET /api/business/jobs/recurring?orgId=xxx
 * Returns recurring schedules owned by org members.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId required.");

  const org = await businessOrganizationRepository.findOrgById(orgId);
  if (!org || !hasBulkAndRecurringAccess(org.plan)) {
    throw new ForbiddenError(
      "Recurring Job Scheduler is available on the Pro and Enterprise plans. Upgrade your plan to use this feature."
    );
  }

  const schedules = await businessService.getOrgRecurringSchedules(orgId, user.userId);
  return NextResponse.json({ schedules });
});
