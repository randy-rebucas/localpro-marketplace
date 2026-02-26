import { NextResponse } from "next/server";
import { adminService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  const stats = await adminService.getStats();
  return NextResponse.json(stats);
});
