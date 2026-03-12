import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { walletRepository } from "@/repositories/wallet.repository";

/**
 * GET /api/admin/users/[id]/wallet-transactions
 *
 * Returns all wallet transactions + balance for a given user.
 * Admin/staff only.
 */
export const GET = withHandler(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;

  const [balance, pendingWithdrawals, transactions, withdrawals] = await Promise.all([
    walletRepository.getBalance(id),
    walletRepository.sumPendingWithdrawals(id),
    walletRepository.listTransactions(id),          // limit = 0 → all
    walletRepository.listWithdrawals(id),
  ]);

  return NextResponse.json({
    balance,
    pendingWithdrawals,
    availableBalance: Math.max(0, balance - pendingWithdrawals),
    transactions:  JSON.parse(JSON.stringify(transactions)),
    withdrawals:   JSON.parse(JSON.stringify(withdrawals)),
  });
});
