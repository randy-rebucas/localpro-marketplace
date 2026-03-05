import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";

/**
 * GET /api/business/jobs/recurring?orgId=xxx
 * Returns recurring schedules owned by org members.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId required.");

  const schedules = await businessService.getOrgRecurringSchedules(orgId, user.userId);
  return NextResponse.json({ schedules });
});
