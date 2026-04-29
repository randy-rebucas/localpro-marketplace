import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyRepository } from "@/repositories/loyalty.repository";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`loyalty-referral:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const account = await loyaltyService.getAccount(user.userId);
  const referredCount = await loyaltyRepository.countReferrals(account.userId.toString());

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const referralLink = `${baseUrl}/register?ref=${account.referralCode}`;

  return NextResponse.json({
    referralCode: account.referralCode,
    referralLink,
    referredCount,
  });
});
