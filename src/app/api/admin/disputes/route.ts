import { NextResponse } from "next/server";
import { disputeService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  const disputes = await disputeService.listDisputes(user);
  return NextResponse.json(disputes);
});
