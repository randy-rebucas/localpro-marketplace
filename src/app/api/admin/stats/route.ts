import { NextResponse } from "next/server";
import { adminService } from "@/services";
import { requireUser, requireRole, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

import { checkRateLimit } from "@/lib/rateLimit";
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  requireCapability(user, "view_revenue"); // L7: stats include revenue — restrict appropriately

  const stats = await adminService.getStats();
  return NextResponse.json(stats);
});
