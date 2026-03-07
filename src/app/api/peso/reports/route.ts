import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "peso");

  const data = await pesoService.getReports(user.userId);
  return NextResponse.json(data);
});
