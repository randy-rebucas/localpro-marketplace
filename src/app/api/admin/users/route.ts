import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const role = searchParams.get("role") ?? undefined;

  const filter = role ? { role } : {};
  const result = await adminService.listUsers(filter, page, limit);
  return NextResponse.json(result);
});
