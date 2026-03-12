import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ledgerRepository } from "@/repositories/ledger.repository";
import { ACCOUNT_NAMES, ACCOUNT_TYPES, type AccountCode } from "@/models/LedgerEntry";

/**
 * GET /api/admin/ledger/reconcile
 *
 * Returns the full trial balance and verifies the double-entry accounting equation:
 *
 *   Assets = Liabilities + Equity + Revenue − Expenses
 *
 * If `balanced` is false, the ledger has an integrity problem.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  const rows = await ledgerRepository.getTrialBalance();

  // Group by account type
  const groups: Record<string, { accountCode: AccountCode; name: string; balancePHP: number }[]> = {
    asset:     [],
    liability: [],
    equity:    [],
    revenue:   [],
    expense:   [],
  };

  for (const row of rows) {
    const type = ACCOUNT_TYPES[row.accountCode as AccountCode];
    if (type && groups[type]) {
      groups[type].push({
        accountCode: row.accountCode as AccountCode,
        name: ACCOUNT_NAMES[row.accountCode as AccountCode],
        balancePHP: row.balancePHP,
      });
    }
  }

  const sum = (arr: { balancePHP: number }[]) =>
    arr.reduce((acc, r) => acc + r.balancePHP, 0);

  const totalAssets      = sum(groups.asset);
  const totalLiabilities = sum(groups.liability);
  const totalEquity      = sum(groups.equity);
  const totalRevenue     = sum(groups.revenue);
  const totalExpenses    = sum(groups.expense);

  // Assets = Liabilities + Equity + Revenue − Expenses
  const lhs = totalAssets + totalExpenses;  // left side of expanded equation
  const rhs = totalLiabilities + totalEquity + totalRevenue;
  const difference = Math.abs(lhs - rhs);
  const balanced = difference < 0.01; // allow ₱0.01 rounding tolerance

  return NextResponse.json({
    balanced,
    equation: {
      assets:      totalAssets,
      liabilities: totalLiabilities,
      equity:      totalEquity,
      revenue:     totalRevenue,
      expenses:    totalExpenses,
      lhs,  // Assets + Expenses
      rhs,  // Liabilities + Equity + Revenue
      difference,
    },
    accounts: groups,
    asOf: new Date().toISOString(),
  });
});
