import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-officer-del:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  assertObjectId(id, "officerId");

  const result = await pesoService.removeOfficer(user.userId, id);
  return NextResponse.json(result);
});
