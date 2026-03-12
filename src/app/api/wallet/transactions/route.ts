import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletRepository } from "@/repositories/wallet.repository";

/**
 * GET /api/wallet/transactions
 *
 * Returns all wallet transactions for the currently logged-in user.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();

  const transactions = await walletRepository.listTransactions(user.userId);

  return NextResponse.json({
    transactions: JSON.parse(JSON.stringify(transactions)),
  });
});
