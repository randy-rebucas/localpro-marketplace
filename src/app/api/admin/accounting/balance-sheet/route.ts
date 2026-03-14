import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ledgerRepository } from "@/repositories/ledger.repository";
import type { AccountCode } from "@/models/LedgerEntry";

const ASSET_CODES:     AccountCode[] = ["1000", "1100", "1200"];
const LIABILITY_CODES: AccountCode[] = ["2000", "2100", "2200", "2300", "2400"];
const EQUITY_CODES:    AccountCode[] = ["3000"];
const REVENUE_CODES:   AccountCode[] = ["4000", "4100", "4200", "4300", "4400", "4500", "4600", "4700", "4800", "4900", "4950", "4960", "4970"];
const EXPENSE_CODES:   AccountCode[] = ["5000", "5100", "5200"];

const LABELS: Record<AccountCode, string> = {
  "1000": "Gateway Receivable",
  "1100": "Escrow Held",
  "1200": "Wallet Funds Held",
  "2000": "Escrow Payable — Clients",
  "2100": "Earnings Payable — Providers",
  "2200": "Wallet Payable — Clients",
  "2300": "Withdrawal Payable — Clients",
  "2400": "Payout In-Flight — Providers",
  "3000": "Platform Equity",
  "4000": "Commission Revenue",
  "4100": "Subscription Revenue",
  "4200": "Late Fee Revenue",
  "4300": "Escrow Fee Revenue",
  "4400": "Processing Fee Revenue",
  "4500": "Withdrawal Fee Revenue",
  "4600": "Urgency Booking Fee Revenue",
  "4700": "Featured Listing Revenue",
  "4800": "Lead Fee Revenue",
  "4900": "Bid Credit Revenue",
  "4950": "Cancellation Fee Revenue",
  "4960": "Dispute Handling Fee Revenue",
  "4970": "Training Course Revenue",
  "5000": "Refunds Issued",
  "5100": "Payment Processing Fees",
  "5200": "Bad Debt / Write-offs",
};

async function sumGroup(codes: AccountCode[], currency: string): Promise<
  { code: AccountCode; name: string; balanceCentavos: number; balancePHP: number }[]
> {
  return Promise.all(
    codes.map(async (code) => {
      const balanceCentavos = await ledgerRepository.computeAccountBalance(code, currency);
      return { code, name: LABELS[code], balanceCentavos, balancePHP: balanceCentavos / 100 };
    })
  );
}

/**
 * GET /api/admin/accounting/balance-sheet?currency=PHP
 *
 * Returns a balance sheet snapshot:
 *   Assets = Liabilities + Equity  (where Equity = Revenue - Expenses)
 *
 * Balances are computed live from the LedgerEntry collection
 * (accurate but ~10 ms slower than cached; use `trial-balance` for dashboards).
 */
export const GET = withHandler(async (req) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const currency = new URL(req.url).searchParams.get("currency") ?? "PHP";

  const [assets, liabilities, equity, revenue, expenses] = await Promise.all([
    sumGroup(ASSET_CODES,     currency),
    sumGroup(LIABILITY_CODES, currency),
    sumGroup(EQUITY_CODES,    currency),
    sumGroup(REVENUE_CODES,   currency),
    sumGroup(EXPENSE_CODES,   currency),
  ]);

  const totalAssets      = assets.reduce((s, r) => s + r.balanceCentavos, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balanceCentavos, 0);
  const totalRevenue     = revenue.reduce((s, r) => s + r.balanceCentavos, 0);
  const totalExpenses    = expenses.reduce((s, r) => s + r.balanceCentavos, 0);
  const netEquity        = totalRevenue - totalExpenses;
  const totalLiabPlusEq  = totalLiabilities + netEquity;
  const balanced         = totalAssets === totalLiabPlusEq;

  return NextResponse.json({
    currency,
    balanced,
    assets:      { items: assets,      totalCentavos: totalAssets,      totalPHP: totalAssets / 100 },
    liabilities: { items: liabilities, totalCentavos: totalLiabilities, totalPHP: totalLiabilities / 100 },
    equity: {
      retainedEarnings: { revenue: revenue, expenses: expenses },
      netEquityCentavos: netEquity,
      netEquityPHP:      netEquity / 100,
    },
    verification: {
      totalAssetsCentavos:          totalAssets,
      totalLiabilitiesPlusEquityCentavos: totalLiabPlusEq,
      diffCentavos:                 totalAssets - totalLiabPlusEq,
    },
  });
});
