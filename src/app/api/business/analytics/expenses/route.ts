import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";

/** GET /api/business/analytics/expenses?orgId=xxx&months=12 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId query param required.");

  const months = Math.min(24, Math.max(1, parseInt(searchParams.get("months") ?? "12", 10) || 12));
  const rows = await businessService.getMonthlyExpenses(orgId, user.userId, months);
  return NextResponse.json({ rows });
});
