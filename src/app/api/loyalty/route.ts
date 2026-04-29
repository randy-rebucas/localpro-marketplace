import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyRepository } from "@/repositories/loyalty.repository";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`loyalty-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const [account, ledger] = await Promise.all([
    loyaltyService.getAccount(user.userId),
    loyaltyRepository.getLedger(user.userId, 20),
  ]);

  return NextResponse.json({ account, ledger });
});
