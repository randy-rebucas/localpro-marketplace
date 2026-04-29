import { NextResponse } from "next/server";
import { supportService } from "@/services/support.service";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

import { checkRateLimit } from "@/lib/rateLimit";
/** GET /api/admin/support — admin gets all support thread summaries */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_support");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const threads = await supportService.listThreads();
  return NextResponse.json(threads);
});
