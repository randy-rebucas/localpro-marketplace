import { NextResponse } from "next/server";
import { disputeService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_disputes");

  const disputes = await disputeService.listDisputes(user);
  return NextResponse.json(disputes);
});
