import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ledgerService } from "@/services/ledger.service";
import KpiCard from "@/components/ui/KpiCard";
import TourGuide from "@/components/shared/TourGuide";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  CircleDollarSign,
  Banknote,
  Layers,
} from "lucide-react";
import AccountingTabs from "./AccountingTabs";

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
  const totalRevenues    = revenues.reduce((s, r) => s + (r.balancePHP ?? 0), 0);
  const totalExpenses    = expenses.reduce((s, r) => s + (r.balancePHP ?? 0), 0);

  const is = incomeStatement as {
    revenue: number;
    expenses: number;
    netIncome: number;
  } | null;

  const netIncomePHP = (is?.netIncome ?? 0) / 100;
  const revenuePHP   = (is?.revenue ?? 0) / 100;

  const earningsPHP  = rows.find((r) => r.accountCode === "2100")?.balancePHP ?? 0;
  // 2000 = in-flight escrow (funded but not yet released or refunded)
  const escrowPHP    = rows.find((r) => r.accountCode === "2000")?.balancePHP ?? 0;

  const debitSide  = totalAssets + totalExpenses;
  const creditSide = totalLiabilities + totalRevenues;
  const isBalanced = Math.abs(debitSide - creditSide) < 0.01;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/30">
          <CircleDollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Accounting Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Double-entry bookkeeping — all amounts in PHP</p>
        </div>
      </div>

      <TourGuide
        pageKey="admin-accounting"
        title="How the Accounting Ledger works"
        steps={[
          { icon: "📒", title: "Double-entry bookkeeping", description: "Every financial event posts a matching debit and credit pair, creating an auditable, tamper-evident journal." },
          { icon: "⚖️", title: "Trial balance", description: "Lists every account with its running balance. Total Debits (Assets + Expenses) must always equal Total Credits (Liabilities + Revenue)." },
          { icon: "📈", title: "Income statement", description: "Shows commission revenue earned minus refunds issued for any date range." },
          { icon: "🔄", title: "Reconciliation", description: "Compares 2100 Earnings Payable in the ledger against transaction records to catch discrepancies early." },
        ]}
      />

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
          title="Escrow In-Flight"
          value={formatCurrency(escrowPHP)}
          subtitle="Funded, awaiting release (2000)"
          icon={<Layers className="h-6 w-6" />}
        />
      </div>

      {/* Reconciliation banner */}
      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
        reconcile.balanced
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
      }`}>
        <span className={`text-base font-bold mt-0.5 ${reconcile.balanced ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
          {reconcile.balanced ? "✓" : "⚠"}
        </span>
        <div>
          <p className={`font-semibold text-sm ${reconcile.balanced ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"}`}>
            {reconcile.balanced
              ? "Earnings Payable is balanced — ledger matches transaction records"
              : "Earnings Payable discrepancy detected"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ledger: <strong>{formatCurrency(reconcile.ledgerBalance / 100)}</strong>
            {" · "}
            Transaction-derived: <strong>{formatCurrency(reconcile.transactionBalance / 100)}</strong>
            {!reconcile.balanced && (
              <> · <span className="text-amber-700 dark:text-amber-400 font-medium">Diff: {formatCurrency(Math.abs(reconcile.diff) / 100)}</span></>
            )}
          </p>
        </div>
      </div>

      {/* Tabbed content: Journal Entries / Trial Balance / Income Statement / Balance Summary */}
      <AccountingTabs
        rows={rows}
        debitSide={debitSide}
        creditSide={creditSide}
        isBalanced={isBalanced}
        escrowPHP={escrowPHP}
      />
    </div>
  );
}
