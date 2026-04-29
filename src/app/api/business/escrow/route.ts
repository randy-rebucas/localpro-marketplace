import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";

/** GET /api/business/escrow?orgId=xxx&page=1&limit=20 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-escrow:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ValidationError("orgId query param required.");

  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

  const data = await businessService.getEscrowData(orgId, user.userId, page, limit);
  return NextResponse.json(data);
});
