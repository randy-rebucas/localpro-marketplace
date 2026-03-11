"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, DollarSign, Wallet, BarChart2, RefreshCw,
  ExternalLink, Clock, AlertCircle, Tag,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  _id:        string;
  jobTitle:   string;
  category:   string;
  gross:      number;
  commission: number;
  net:        number;
  status:     string;
  date:       string;
}

interface EarningsData {
  agencyName: string;
  totals: {
    grossAllTime:     number;
    netAllTime:       number;
    commissionPaid:   number;
    thisMonthGross:   number;
    thisMonthNet:     number;
    pendingPayouts:   number;
    availableBalance: number;
  };
  trend:        { month: string; revenue: number }[];
  transactions: Transaction[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortMonth(m: string) {
  const [year, mon] = m.split("-");
  return new Date(Number(year), Number(mon) - 1, 1).toLocaleString("default", { month: "short" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700",
    pending:   "bg-amber-50  text-amber-700",
    refunded:  "bg-rose-50   text-rose-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600">{label}</p>
      <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EarningsClient() {
  const [data, setData]         = useState<EarningsData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [months, setMonths]     = useState(6);

  const load = useCallback(async (m = months) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetchClient<EarningsData>(`/api/provider/agency/earnings?months=${m}`);
      setData(res);
    } catch {
      setLoadError(true);
      toast.error("Failed to load earnings.");
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  function handleMonthsChange(m: number) {
    setMonths(m);
    load(m);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-56 bg-slate-200 rounded-2xl" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle className="h-10 w-10 text-red-300" />
        <p className="font-semibold text-slate-700">Could not load earnings</p>
        <p className="text-sm text-slate-400">There was a problem fetching your earnings data.</p>
        <button onClick={() => load(months)} className="btn-primary mt-2 flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  const totals      = data?.totals;
  const monthlyData = data?.trend ?? [];
  const txns        = data?.transactions ?? [];

  // Month-over-month change
  const momChange = (() => {
    if (monthlyData.length < 2) return null;
    const prev = monthlyData[monthlyData.length - 2].revenue;
    const curr = monthlyData[monthlyData.length - 1].revenue;
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  })();

  // Commission effective rate
  const effectiveRate = totals?.grossAllTime
    ? Math.round((totals.commissionPaid / totals.grossAllTime) * 100)
    : 0;

  // Category breakdown from transactions
  const categoryMap = new Map<string, number>();
  for (const t of txns) {
    if (t.category && t.category !== "—") {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.net);
    }
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"];

  const KPI_CARDS = [
    { label: "Gross All Time",      value: formatCurrency(totals?.grossAllTime     ?? 0), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
    { label: "Net All Time",        value: formatCurrency(totals?.netAllTime       ?? 0), icon: DollarSign, color: "text-blue-700",   bg: "bg-blue-50",   ring: "ring-blue-100"   },
    { label: "This Month Gross",    value: formatCurrency(totals?.thisMonthGross   ?? 0), icon: BarChart2,  color: "text-sky-600",   bg: "bg-sky-50",    ring: "ring-sky-100"    },
    { label: "This Month Net",      value: formatCurrency(totals?.thisMonthNet     ?? 0), icon: DollarSign, color: "text-blue-600",  bg: "bg-blue-50",   ring: "ring-blue-100"   },
    { label: `Commission (${effectiveRate}%)`, value: formatCurrency(totals?.commissionPaid ?? 0), icon: BarChart2, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" },
    { label: "Available to Withdraw", value: formatCurrency(totals?.availableBalance ?? 0), icon: Wallet, color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agency Earnings</h1>
          {data?.agencyName && (
            <p className="text-slate-500 text-sm mt-1">Revenue overview for <strong>{data.agencyName}</strong>.</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input text-sm"
            value={months}
            onChange={(e) => handleMonthsChange(Number(e.target.value))}
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button
            onClick={() => load(months)}
            className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link href="/provider/payouts" className="btn-primary flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPI_CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className={`${c.bg} ring-4 ${c.ring} p-2 rounded-xl w-fit`}>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{c.label}</p>
            <p className={`text-xl font-bold leading-tight ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Monthly Revenue Chart ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">Monthly Net Revenue</h2>
          {momChange !== null && (
            <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
              momChange > 0 ? "bg-emerald-50 text-emerald-700" :
              momChange < 0 ? "bg-red-50 text-red-600" :
              "bg-slate-100 text-slate-500"
            }`}>
              {momChange > 0 ? `+${momChange}%` : `${momChange}%`} vs last month
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400">After commission</span>
        </div>
        {monthlyData.every((r) => r.revenue === 0) ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BarChart2 className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-400">No revenue data yet for this period</p>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={32}>
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={i === monthlyData.length - 1 ? "#6366f1" : "#e0e7ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Category Breakdown ── */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Tag className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">Revenue by Category</h2>
            <span className="ml-auto text-xs text-slate-400">Net · last 50 transactions</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Bar list */}
            <div className="p-5 space-y-3">
              {categoryData.map((c, i) => {
                const max = categoryData[0].value;
                const pct = Math.round((c.value / max) * 100);
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{c.name}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
                        {formatCurrency(c.value)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pie chart */}
            <div className="flex items-center justify-center p-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => <span className="text-[10px] text-slate-600">{value}</span>}
                    iconSize={8}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Net"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Transactions ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">Transactions</h2>
            <p className="text-xs text-slate-400 mt-0.5">All transactions for this agency (owner + staff) · last 50</p>
          </div>
          <Link href="/provider/payouts" className="text-xs text-primary hover:underline flex items-center gap-1">
            Payouts <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {txns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <DollarSign className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-400">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Job</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Gross</th>
                  <th className="text-right px-5 py-3">Commission</th>
                  <th className="text-right px-5 py-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {txns.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]">{t.jobTitle}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.category}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(t.date)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(t.gross)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-amber-600 text-xs font-semibold tabular-nums">
                      -{formatCurrency(t.commission)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(t.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
