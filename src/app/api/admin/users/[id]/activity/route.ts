import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { activityRepository } from "@/repositories/activity.repository";
import { assertObjectId } from "@/lib/errors";

/**
 * GET /api/admin/users/[id]/activity?page=1&limit=20
 *
 * Returns paginated activity log entries for the given user.
 */
export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const { id } = await params;
  assertObjectId(id, "userId");
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10) || 20);

  const { logs, total } = await activityRepository.findByUser(id, { page, limit });

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});
