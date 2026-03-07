import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletService } from "@/services/wallet.service";

/** GET /api/wallet — returns balance, transaction history, and withdrawal requests */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const data = await walletService.getWallet(user.userId);
  return NextResponse.json(data);
});
