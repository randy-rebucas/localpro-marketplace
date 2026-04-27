import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { userRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
/** GET /api/admin/kyc — list all users (providers + clients) with KYC submissions */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_kyc");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const users = await userRepository.findUsersByKycStatus(
    ["pending", "approved", "rejected"]
  );

  return NextResponse.json(users);
});
