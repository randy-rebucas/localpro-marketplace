import { NextResponse } from "next/server";
import { adminService } from "@/services";
import { requireUser, requireRole, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");
  requireCapability(user, "view_revenue"); // L7: stats include revenue — restrict appropriately

  const stats = await adminService.getStats();
  return NextResponse.json(stats);
});
