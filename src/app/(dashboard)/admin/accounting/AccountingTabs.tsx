"use client";

import { useState } from "react";
import { BookOpen, Scale, TrendingUp, LayoutDashboard, PenLine } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import AccountingClient from "./AccountingClient";
import LedgerEntriesClient from "./LedgerEntriesClient";
import ManualEntryForm from "./ManualEntryForm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrialBalanceRow {
  accountCode: string;
  name: string;
  type: string;
  balancePHP: number;
}

interface Props {
  rows: TrialBalanceRow[];
  debitSide: number;
  creditSide: number;
  isBalanced: boolean;
  escrowPHP: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "journal",  label: "Journal Entries",  icon: BookOpen       },
  { id: "trial",    label: "Trial Balance",    icon: Scale          },
  { id: "income",   label: "Income Statement", icon: TrendingUp     },
  { id: "balance",  label: "Balance Summary",  icon: LayoutDashboard },
  { id: "manual",   label: "Manual Entry",     icon: PenLine        },
] as const;

type TabId = typeof TABS[number]["id"];

const SECTION_COLORS: Record<string, { label: string; badge: string; text: string }> = {
  asset:     { label: "Assets",      badge: "bg-blue-50 text-blue-700",     text: "text-blue-700"   },
  liability: { label: "Liabilities", badge: "bg-orange-50 text-orange-700", text: "text-orange-700" },
  revenue:   { label: "Revenue",     badge: "bg-green-50 text-green-700",   text: "text-green-700"  },
  expense:   { label: "Expenses",    badge: "bg-red-50 text-red-700",       text: "text-red-700"    },
};

// ─── Trial Balance panel ──────────────────────────────────────────────────────

function TrialBalancePanel({ rows, debitSide, creditSide, isBalanced }: Omit<Props, "escrowPHP">) {
  const assets      = rows.filter((r) => r.type === "asset");
  const liabilities = rows.filter((r) => r.type === "liability");
  const revenues    = rows.filter((r) => r.type === "revenue");
  const expenses    = rows.filter((r) => r.type === "expense");

  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-slate-400 text-sm">
        No ledger entries yet. Balances will appear once transactions are processed.
      </p>
    );
  }

  return (
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
            <td colSpan={3} className="px-5 py-3 text-sm font-bold text-slate-700">Total Debits (Assets + Expenses)</td>
            <td className="px-5 py-3 text-right font-bold text-blue-700 tabular-nums">{formatCurrency(debitSide)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="px-5 py-2.5 text-sm font-bold text-slate-700">Total Credits (Liabilities + Revenue)</td>
            <td className="px-5 py-2.5 text-right font-bold text-orange-700 tabular-nums">{formatCurrency(creditSide)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-5 py-2.5 text-sm">
              {isBalanced
                ? <span className="text-green-600 font-semibold">✓ Balanced</span>
                : <span className="text-red-600 font-semibold">⚠ Out of balance by {formatCurrency(Math.abs(debitSide - creditSide))}</span>}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Balance Summary panel ────────────────────────────────────────────────────

function BalanceSummaryPanel({ rows, debitSide, creditSide, isBalanced, escrowPHP }: Props) {
  const assets      = rows.filter((r) => r.type === "asset");
  const liabilities = rows.filter((r) => r.type === "liability");
  const revenues    = rows.filter((r) => r.type === "revenue");
  const expenses    = rows.filter((r) => r.type === "expense");

  const totalAssets      = assets.reduce((s, r) => s + (r.balancePHP ?? 0), 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + (r.balancePHP ?? 0), 0);
  const totalRevenues    = revenues.reduce((s, r) => s + (r.balancePHP ?? 0), 0);
  const totalExpenses    = expenses.reduce((s, r) => s + (r.balancePHP ?? 0), 0);
  const earningsPHP      = rows.find((r) => r.accountCode === "2100")?.balancePHP ?? 0;

  return (
    <div className="p-5 space-y-4 text-sm max-w-lg">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assets</p>
        <div className="flex justify-between">
          <span className="text-slate-500">Total Assets</span>
          <span className="font-semibold text-blue-700 tabular-nums">{formatCurrency(totalAssets)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Gateway Receivable (1000)</span>
          <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(escrowPHP)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Liabilities</p>
        <div className="flex justify-between">
          <span className="text-slate-500">Total Liabilities</span>
          <span className="font-semibold text-orange-700 tabular-nums">{formatCurrency(totalLiabilities)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Earnings Payable (2100)</span>
          <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(earningsPHP)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Income</p>
        <div className="flex justify-between">
          <span className="text-slate-500">Total Revenue</span>
          <span className="font-semibold text-green-700 tabular-nums">{formatCurrency(totalRevenues)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Total Expenses</span>
          <span className="font-semibold text-red-600 tabular-nums">
            {totalExpenses > 0 ? `(${formatCurrency(totalExpenses)})` : formatCurrency(0)}
          </span>
        </div>
      </div>

      <div className="border-t-2 border-slate-200 pt-4 flex items-center justify-between">
        <span className="font-bold text-slate-800">Balance Check</span>
        {isBalanced ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            ✓ Debits = Credits ({formatCurrency(debitSide)})
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            ⚠ Off by {formatCurrency(Math.abs(debitSide - creditSide))}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AccountingTabs(props: Props) {
  const [tab, setTab] = useState<TabId>("journal");

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px ${
              tab === id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className={tab === "journal" ? "" : "hidden"}>
        <LedgerEntriesClient embedded />
      </div>

      {tab === "trial" && (
        <TrialBalancePanel
          rows={props.rows}
          debitSide={props.debitSide}
          creditSide={props.creditSide}
          isBalanced={props.isBalanced}
        />
      )}

      {tab === "income" && <AccountingClient embedded />}

      {tab === "balance" && (
        <BalanceSummaryPanel {...props} />
      )}

      {tab === "manual" && <ManualEntryForm />}
    </div>
  );
}
