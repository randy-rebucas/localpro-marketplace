import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { id } = await ctx.params;
  const result = await pesoService.removeOfficer(user.userId, id);
  return NextResponse.json(result);
});
