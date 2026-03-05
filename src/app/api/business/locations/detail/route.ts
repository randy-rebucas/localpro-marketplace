import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";

/** GET /api/business/locations/detail?orgId=xxx&locationId=yyy */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { searchParams } = new URL(req.url);
  const orgId      = searchParams.get("orgId");
  const locationId = searchParams.get("locationId");
  if (!orgId || !locationId) throw new ValidationError("orgId and locationId query params required.");

  const detail = await businessService.getLocationDetail(orgId, locationId, user.userId);
  return NextResponse.json(detail);
});
