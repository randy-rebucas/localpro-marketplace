import { NextRequest, NextResponse } from "next/server";
import { escrowService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  const result = await escrowService.markJobComplete(user, id);
  return NextResponse.json({ ...result, message: "Job marked as completed" });
});
