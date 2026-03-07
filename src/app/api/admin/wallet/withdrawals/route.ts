import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletRepository } from "@/repositories/wallet.repository";

/** GET /api/admin/wallet/withdrawals */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  const withdrawals = await walletRepository.listAllWithdrawals();
  return NextResponse.json({ withdrawals });
});
