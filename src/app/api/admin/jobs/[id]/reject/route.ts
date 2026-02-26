import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const job = await adminService.rejectJob(user.userId, id);
  return NextResponse.json({ job, message: "Job rejected" });
});
