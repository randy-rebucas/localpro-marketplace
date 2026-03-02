import { NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyRepository } from "@/repositories/loyalty.repository";

export const GET = withHandler(async () => {
  const user = await requireUser();

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
