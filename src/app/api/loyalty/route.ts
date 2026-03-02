import { NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyRepository } from "@/repositories/loyalty.repository";

export const GET = withHandler(async () => {
  const user = await requireUser();

  const [account, ledger] = await Promise.all([
    loyaltyService.getAccount(user.userId),
    loyaltyRepository.getLedger(user.userId, 20),
  ]);

  return NextResponse.json({ account, ledger });
});
