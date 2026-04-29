import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-dashboard:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const stats = await pesoService.getDashboardStats(user.userId);
  return NextResponse.json(stats);
});
