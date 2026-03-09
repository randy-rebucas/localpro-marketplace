"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, RefreshCw } from "lucide-react";

interface IncomeStatementData {
  revenue: number;
  expenses: number;
  netIncome: number;
  breakdown: Record<string, number>;
}

export default function AccountingClient() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [from, setFrom] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
  const [to, setTo] = useState(now.toISOString().split("T")[0]);
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIS = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounting/income-statement?from=${from}&to=${to}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchIS(); }, [fetchIS]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/admin/accounting/reconcile", { method: "POST" });
      await fetchIS();
    } finally {
      setRefreshing(false);
    }
  };

  const netIncomePHP = (data?.netIncome ?? 0) / 100;
  const revenuePHP   = (data?.revenue ?? 0) / 100;
  const expensesPHP  = (data?.expenses ?? 0) / 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-800">Income Statement</h3>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-slate-400 text-xs">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh ledger balances"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-5 space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Commission Revenue (4000)</span>
            <span className="font-medium text-green-700 tabular-nums">{formatCurrency(revenuePHP)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
            <span className="font-medium text-slate-700">Total Revenue</span>
            <span className="font-semibold text-green-700 tabular-nums">{formatCurrency(revenuePHP)}</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-500">Refunds Issued (5000)</span>
            <span className="font-medium text-red-600 tabular-nums">
              {expensesPHP > 0 ? `(${formatCurrency(expensesPHP)})` : formatCurrency(0)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-100 pt-1">
            <span className="font-medium text-slate-700">Total Expenses</span>
            <span className="font-semibold text-red-600 tabular-nums">
              {expensesPHP > 0 ? `(${formatCurrency(expensesPHP)})` : formatCurrency(0)}
            </span>
          </div>

          <div className="flex justify-between items-center border-t-2 border-slate-200 pt-3">
            <span className="font-bold text-slate-900 text-base">Net Income</span>
            <span className={`font-bold text-base tabular-nums ${netIncomePHP >= 0 ? "text-green-700" : "text-red-600"}`}>
              {netIncomePHP < 0 ? `(${formatCurrency(Math.abs(netIncomePHP))})` : formatCurrency(netIncomePHP)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
