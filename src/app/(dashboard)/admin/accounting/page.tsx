import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ledgerService } from "@/services/ledger.service";
import KpiCard from "@/components/ui/KpiCard";
import PageGuide from "@/components/shared/PageGuide";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  CircleDollarSign,
  Banknote,
} from "lucide-react";
import AccountingClient from "./AccountingClient";

export const metadata: Metadata = { title: "Accounting Ledger" };

export default async function AccountingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [trialBalance, incomeStatement, reconcile] = await Promise.all([
    ledgerService.getTrialBalance("PHP"),
    ledgerService.getIncomeStatement(firstOfMonth, now, "PHP"),
    ledgerService.reconcileEarningsPayable("PHP"),
  ]);

  const rows = Array.isArray(trialBalance) ? trialBalance : [];

  const assets      = rows.filter((r) => r.type === "asset");
  const liabilities = rows.filter((r) => r.type === "liability");
  const revenues    = rows.filter((r) => r.type === "revenue");
  const expenses    = rows.filter((r) => r.type === "expense");

  const totalAssets      = assets.reduce((s, r) => s + (r.balancePHP ?? 0), 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + (r.balancePHP ?? 0), 0);

  const is = incomeStatement as {
    revenue: number;
    expenses: number;
    netIncome: number;
  } | null;

  const netIncomePHP = (is?.netIncome ?? 0) / 100;
  const revenuePHP   = (is?.revenue ?? 0) / 100;
  const refundsPHP   = (is?.expenses ?? 0) / 100;
  const earningsPHP  = rows.find((r) => r.accountCode === "2100")?.balancePHP ?? 0;
  const escrowPHP    = rows.find((r) => r.accountCode === "1100")?.balancePHP ?? 0;

  const isBalanced = Math.abs(totalAssets - totalLiabilities) < 0.01;

  const SECTION_COLORS: Record<string, { label: string; badge: string; text: string }> = {
    asset:     { label: "Assets",      badge: "bg-blue-50 text-blue-700",     text: "text-blue-700"   },
    liability: { label: "Liabilities", badge: "bg-orange-50 text-orange-700", text: "text-orange-700" },
    revenue:   { label: "Revenue",     badge: "bg-green-50 text-green-700",   text: "text-green-700"  },
    expense:   { label: "Expenses",    badge: "bg-red-50 text-red-700",       text: "text-red-700"    },
  } as const;

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="admin-accounting"
        title="How the Accounting Ledger works"
        steps={[
          { icon: "📒", title: "Double-entry bookkeeping", description: "Every financial event posts a matching debit and credit pair, creating an auditable, tamper-evident journal." },
          { icon: "⚖️", title: "Trial balance", description: "Lists every account with its running balance. Total Assets should always equal Total Liabilities." },
          { icon: "📈", title: "Income statement", description: "Shows commission revenue earned minus refunds issued for any date range." },
          { icon: "🔄", title: "Reconciliation", description: "Compares 2100 Earnings Payable in the ledger against transaction records to catch discrepancies early." },
        ]}
      />

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Accounting Ledger</h2>
        <p className="text-slate-500 text-sm mt-0.5">Double-entry bookkeeping — all amounts in PHP</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="MTD Net Income"
          value={formatCurrency(netIncomePHP)}
          subtitle="Commission minus refunds"
          icon={<TrendingUp className="h-6 w-6" />}
          className={netIncomePHP >= 0 ? "border-green-200" : "border-red-200"}
        />
        <KpiCard
          title="MTD Commission"
          value={formatCurrency(revenuePHP)}
          subtitle="Revenue accrued this month"
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
        <KpiCard
          title="Earnings Payable"
          value={formatCurrency(earningsPHP)}
          subtitle="Owed to providers (2100)"
          icon={<Banknote className="h-6 w-6" />}
        />
        <KpiCard
          title="MTD Refunds"
          value={formatCurrency(refundsPHP)}
          subtitle="Dispute refunds this month"
          icon={<TrendingDown className="h-6 w-6" />}
          className={refundsPHP > 0 ? "border-red-200" : ""}
        />
      </div>

      {/* Reconciliation banner */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${reconcile.balanced ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <span className={`text-base font-bold mt-0.5 ${reconcile.balanced ? "text-green-600" : "text-amber-600"}`}>
          {reconcile.balanced ? "✓" : "⚠"}
        </span>
        <div>
          <p className={`font-semibold text-sm ${reconcile.balanced ? "text-green-800" : "text-amber-800"}`}>
            {reconcile.balanced
              ? "Earnings Payable is balanced — ledger matches transaction records"
              : "Earnings Payable discrepancy detected"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Ledger: <strong>{formatCurrency(reconcile.ledgerBalance / 100)}</strong>
            {" · "}
            Transaction-derived: <strong>{formatCurrency(reconcile.transactionBalance / 100)}</strong>
            {!reconcile.balanced && (
              <> · <span className="text-amber-700 font-medium">Diff: {formatCurrency(Math.abs(reconcile.diff) / 100)}</span></>
            )}
          </p>
        </div>
      </div>

      {/* Income Statement (interactive) + Balance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccountingClient />

        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-800">Balance Summary</h3>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Assets</span>
              <span className="font-semibold text-blue-700 tabular-nums">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Liabilities</span>
              <span className="font-semibold text-orange-700 tabular-nums">{formatCurrency(totalLiabilities)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Escrow Held (1100)</span>
              <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(escrowPHP)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Balance Check</span>
              {isBalanced ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Balanced</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Off by {formatCurrency(Math.abs(totalAssets - totalLiabilities))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trial Balance table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-800">Trial Balance</h3>
          </div>
          <span className="text-xs text-slate-400">All-time running balances</span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-400 text-sm">
            No ledger entries yet. Balances will appear once transactions are processed.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Account</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Balance (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(["asset", "liability", "revenue", "expense"] as const).flatMap((type) => {
                  const section = { asset: assets, liability: liabilities, revenue: revenues, expense: expenses }[type];
                  if (!section || section.length === 0) return [];
                  const c = SECTION_COLORS[type];
                  return [
                    <tr key={`hd-${type}`}>
                      <td colSpan={4} className="px-5 py-2 bg-slate-50">
                        <span className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${c.badge}`}>
                          {c.label}
                        </span>
                      </td>
                    </tr>,
                    ...section.map((row) => (
                      <tr key={row.accountCode} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.accountCode}</td>
                        <td className="px-5 py-3 text-slate-800 font-medium">{row.name}</td>
                        <td className="px-5 py-3 capitalize text-xs text-slate-400 hidden sm:table-cell">{row.type}</td>
                        <td className={`px-5 py-3 text-right font-semibold tabular-nums ${c.text}`}>
                          {formatCurrency(row.balancePHP ?? 0)}
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-sm font-bold text-slate-700">Total Assets</td>
                  <td className="px-5 py-3 text-right font-bold text-blue-700 tabular-nums">{formatCurrency(totalAssets)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2.5 text-sm font-bold text-slate-700">Total Liabilities</td>
                  <td className="px-5 py-2.5 text-right font-bold text-orange-700 tabular-nums">{formatCurrency(totalLiabilities)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-5 py-2.5 text-sm">
                    {isBalanced
                      ? <span className="text-green-600 font-semibold">✓ Balanced</span>
                      : <span className="text-red-600 font-semibold">⚠ Out of balance by {formatCurrency(Math.abs(totalAssets - totalLiabilities))}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
