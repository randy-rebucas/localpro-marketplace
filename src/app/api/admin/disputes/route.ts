import { NextResponse } from "next/server";
import { disputeService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

import { checkRateLimit } from "@/lib/rateLimit";
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_disputes");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const disputes = await disputeService.listDisputes(user);
  return NextResponse.json(disputes);
});
