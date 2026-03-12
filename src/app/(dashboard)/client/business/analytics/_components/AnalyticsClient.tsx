"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  TrendingUp, Star, User, Download,
  CheckCircle, AlertTriangle, Briefcase, BarChart2, FileText,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type {
  IBusinessOrganization, MonthlyExpenseRow, ProviderPerformanceRow,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AnalyticsClient() {
  const [org, setOrg]           = useState<IBusinessOrganization | null>(null);
  const [expenses, setExpenses] = useState<MonthlyExpenseRow[]>([]);
  const [providers, setProviders] = useState<ProviderPerformanceRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [months, setMonths]     = useState(12);
  const monthsRef = useRef(12);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");

  const load = useCallback(async (m = monthsRef.current) => {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org");
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const id = orgData.org._id.toString();
      setOrgId(id);

      const [expData, provData] = await Promise.all([
        fetchClient<{ rows: MonthlyExpenseRow[] }>(
          `/api/business/analytics/expenses?orgId=${id}&months=${m}`
        ),
        fetchClient<{ rows: ProviderPerformanceRow[] }>(
          `/api/business/analytics/providers?orgId=${id}`
        ),
      ]);
      setExpenses(expData.rows);
      setProviders(provData.rows);
    } catch {
      toast.error("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleMonthsChange(m: number) {
    monthsRef.current = m;
    setMonths(m);
    load(m);
  }

  function handleCsvDownload() {
    if (!orgId) return;
    window.location.href = `/api/business/analytics/report?orgId=${orgId}&months=${months}`;
  }

  async function togglePreferred(
    providerId: string, locationId: string, isPreferred: boolean
  ) {
    if (!orgId) return;
    setTogglingId(providerId);
    try {
      await fetchClient("/api/business/preferred-providers", {
        method: "POST",
        body: JSON.stringify({ orgId, locationId, providerId, add: !isPreferred }),
      });
      toast.success(isPreferred ? "Removed from preferred vendors." : "Added to preferred vendors.");
      await load(months);
    } catch {
      toast.error("Failed to update preferred vendor.");
    } finally {
      setTogglingId(null);
    }
  }

  const maxSpend   = Math.max(...expenses.map((r) => r.totalSpend), 1);
  const totalSpend = expenses.reduce((s, r) => s + r.totalSpend, 0);
  const totalJobs  = expenses.reduce((s, r) => s + r.jobCount, 0);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!org) {
    return (
      <p className="text-slate-500 py-16 text-center">
        No business profile found.{" "}
        <a href="/client/business" className="text-primary underline">Create one first.</a>
      </p>
    );
  }

  // Default location for preferred-vendor toggle (use first location)
  const defaultLocationId = org.locations[0]?._id?.toString() ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <BarChart2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Analytics</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Expense trends and provider performance for {org.name}.</p>
          </div>
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
            <option value={24}>Last 24 months</option>
          </select>
          <button
            onClick={() => setCompareMode((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              compareMode
                ? "bg-primary text-white border-primary"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <BarChart2 className="h-4 w-4" /> Compare
          </button>
          <button
            onClick={handleCsvDownload}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Total Spend",  value: formatCurrency(totalSpend), color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Total Jobs",   value: totalJobs,                  color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Avg / Month",  value: formatCurrency(expenses.length > 0 ? totalSpend / expenses.length : 0), color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`${kpi.bg} p-2.5 rounded-lg`}>
              <TrendingUp className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Provider Comparison Mode ── */}
      {compareMode && (
        <div className="bg-white rounded-xl border border-primary/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Provider Comparison
            </h2>
            <button
              onClick={() => { setCompareMode(false); setCompareA(""); setCompareB(""); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {(["A", "B"] as const).map((side) => {
              const val  = side === "A" ? compareA : compareB;
              const setV = side === "A" ? setCompareA : setCompareB;
              const other = side === "A" ? compareB : compareA;
              return (
                <div key={side}>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">
                    Provider {side}
                  </label>
                  <select
                    className="input text-sm w-full"
                    value={val}
                    onChange={(e) => setV(e.target.value)}
                  >
                    <option value="">Select provider…</option>
                    {providers
                      .filter((p) => p.providerId !== other)
                      .map((p) => (
                        <option key={p.providerId} value={p.providerId}>
                          {p.providerName}
                        </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>

          {(() => {
            const pA = providers.find((p) => p.providerId === compareA);
            const pB = providers.find((p) => p.providerId === compareB);
            if (!pA || !pB) {
              return (
                <p className="text-sm text-slate-400 text-center py-4">
                  Select two providers above to compare.
                </p>
              );
            }
            const metrics: Array<{
              label: string;
              a: number;
              b: number;
              fmt: (v: number) => string;
              higherBetter: boolean;
              max?: number;
            }> = [
              { label: "Jobs Completed",  a: pA.completedJobs,          b: pB.completedJobs,          fmt: (v) => v.toString(),         higherBetter: true  },
              { label: "Avg Rating",      a: pA.avgRating,              b: pB.avgRating,              fmt: (v) => v.toFixed(1),         higherBetter: true, max: 5   },
              { label: "On-Time Rate",    a: 100 - pA.delayFrequency,   b: 100 - pB.delayFrequency,   fmt: (v) => `${v.toFixed(0)}%`,   higherBetter: true, max: 100 },
              { label: "Disputes",        a: pA.disputeCount,           b: pB.disputeCount,           fmt: (v) => v.toString(),         higherBetter: false },
              { label: "Efficiency",      a: pA.costEfficiencyScore,    b: pB.costEfficiencyScore,    fmt: (v) => v.toString(),         higherBetter: true, max: 100 },
              { label: "Total Spend",     a: pA.totalSpend,             b: pB.totalSpend,             fmt: (v) => formatCurrency(v),    higherBetter: false },
            ];
            return (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Provider name headers */}
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
                    {pA.providerAvatar ? (
                      <Image src={pA.providerAvatar} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <span className="truncate">{pA.providerName}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium px-4">vs</span>
                  <div className="flex-1 flex items-center justify-end gap-2 text-xs font-semibold text-slate-700 truncate">
                    <span className="truncate text-right">{pB.providerName}</span>
                    {pB.providerAvatar ? (
                      <Image src={pB.providerAvatar} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-violet-500" />
                      </div>
                    )}
                  </div>
                </div>
                {metrics.map(({ label, a, b, fmt, higherBetter, max }) => {
                  const maxVal = max ?? Math.max(a, b, 1);
                  const pctA   = Math.min(100, maxVal > 0 ? (a / maxVal) * 100 : 0);
                  const pctB   = Math.min(100, maxVal > 0 ? (b / maxVal) * 100 : 0);
                  const aWins  = higherBetter ? a > b : a < b;
                  const bWins  = higherBetter ? b > a : b < a;
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-bold tabular-nums ${aWins ? "text-emerald-600" : "text-slate-500"}`}>
                          {fmt(a)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                        <span className={`font-bold tabular-nums ${bWins ? "text-emerald-600" : "text-slate-500"}`}>
                          {fmt(b)}
                        </span>
                      </div>
                      <div className="flex gap-1 h-2.5">
                        {/* Provider A bar (right-align) */}
                        <div className="flex-1 bg-slate-100 rounded-l-full overflow-hidden flex justify-end">
                          <div
                            className={`h-full rounded-l-full transition-all duration-500 ${aWins ? "bg-primary" : "bg-slate-300"}`}
                            style={{ width: `${pctA}%` }}
                          />
                        </div>
                        <div className="w-px bg-slate-200 flex-shrink-0" />
                        {/* Provider B bar (left-align) */}
                        <div className="flex-1 bg-slate-100 rounded-r-full overflow-hidden">
                          <div
                            className={`h-full rounded-r-full transition-all duration-500 ${bWins ? "bg-violet-500" : "bg-slate-300"}`}
                            style={{ width: `${pctB}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Winner summary */}
                {(() => {
                  const wins = metrics.reduce((acc, { a, b, higherBetter }) => {
                    if (higherBetter ? a > b : a < b) acc.a++;
                    else if (higherBetter ? b > a : b < a) acc.b++;
                    return acc;
                  }, { a: 0, b: 0 });
                  const winner = wins.a > wins.b ? pA : wins.b > wins.a ? pB : null;
                  return winner ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <p className="text-sm text-emerald-800">
                        <strong>{winner.providerName}</strong> leads in {wins.a > wins.b ? wins.a : wins.b} of {metrics.length} metrics.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <p className="text-sm text-slate-500">Tied — both providers are evenly matched.</p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Monthly expense bar chart with MoM arrows ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Monthly Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No expense data for this period.</p>
        ) : (
          <div className="space-y-2">
            {[...expenses].reverse().map((row) => {
              const momLabel =
                row.momChange === null ? null :
                row.momChange > 0      ? `▲ ${row.momChange.toFixed(1)}%` :
                row.momChange < 0      ? `▼ ${Math.abs(row.momChange).toFixed(1)}%` :
                null;
              const momColor =
                row.momChange === null   ? "" :
                row.momChange > 0        ? "text-red-500" :
                row.momChange < 0        ? "text-emerald-600" :
                "";

              return (
                <div key={row.month} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16 flex-shrink-0">{row.month}</span>
                  <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-md flex items-center px-2 transition-all"
                      style={{
                        width: `${(row.totalSpend / maxSpend) * 100}%`,
                        minWidth: row.totalSpend > 0 ? "2rem" : 0,
                      }}
                    >
                      {row.totalSpend > 0 && (
                        <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                          {formatCurrency(row.totalSpend)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">
                    {row.jobCount} job{row.jobCount !== 1 ? "s" : ""}
                  </span>
                  {momLabel && (
                    <span className={`text-xs font-semibold w-16 text-right flex-shrink-0 ${momColor}`}>
                      {momLabel}
                    </span>
                  )}
                  {!momLabel && <span className="w-16 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Provider performance (enhanced) ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Provider Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Completed jobs across all org members. ★ marks preferred vendors.
          </p>
        </div>
        {providers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No completed jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Provider</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Jobs</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Rating</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Total Spend</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">On-Time</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Disputes</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Efficiency</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Preferred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map((p, idx) => (
                  <tr key={p.providerId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.providerAvatar ? (
                          <Image src={p.providerAvatar} alt="avatar" width={32} height={32}
                            className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{p.providerName}</p>
                          {p.isPreferred && (
                            <span className="text-[10px] text-amber-600 font-semibold">★ Preferred</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{p.completedJobs}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                        <span className="font-semibold text-slate-700">
                          {p.avgRating > 0 ? p.avgRating.toFixed(1) : "—"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(p.totalSpend)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      p.delayFrequency > 30 ? "text-red-500" :
                      p.delayFrequency > 10 ? "text-amber-500" :
                      "text-emerald-600"
                    }`}>
                      {(100 - p.delayFrequency).toFixed(0)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      p.disputeCount > 0 ? "text-red-500" : "text-slate-400"
                    }`}>
                      {p.disputeCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        p.costEfficiencyScore >= 70 ? "text-emerald-600" :
                        p.costEfficiencyScore >= 40 ? "text-amber-600" :
                        "text-red-500"
                      }`}>
                        {p.costEfficiencyScore >= 70 && <CheckCircle className="h-3 w-3" />}
                        {p.costEfficiencyScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          togglePreferred(p.providerId, defaultLocationId, p.isPreferred)
                        }
                        disabled={togglingId === p.providerId || !defaultLocationId}
                        title={p.isPreferred ? "Remove from preferred" : "Add to preferred"}
                        className={`p-1.5 rounded transition-colors ${
                          p.isPreferred
                            ? "text-amber-500 hover:text-amber-600 bg-amber-50"
                            : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${p.isPreferred ? "fill-amber-400" : ""}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Download Reports ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-800">Download Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Export expense and performance data for accounting or procurement review.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: "Monthly Expense",
              desc:  `Last ${months} months · All branches`,
              href:  `/api/business/analytics/report?orgId=${orgId}&months=${months}`,
              icon:  FileText,
              color: "text-blue-600",    bg: "bg-blue-50",
            },
            {
              title: "Per Branch",
              desc:  "Spend breakdown by branch",
              href:  `/api/business/analytics/report?orgId=${orgId}&months=${months}&type=branch`,
              icon:  FileText,
              color: "text-violet-600",  bg: "bg-violet-50",
            },
            {
              title: "Per Provider",
              desc:  "Jobs, ratings & spend per provider",
              href:  `/api/business/analytics/report?orgId=${orgId}&months=${months}&type=providers`,
              icon:  Download,
              color: "text-emerald-600", bg: "bg-emerald-50",
            },
            {
              title: "Per Category",
              desc:  "Spend split by service category",
              href:  `/api/business/analytics/report?orgId=${orgId}&months=${months}&type=categories`,
              icon:  Download,
              color: "text-amber-600",   bg: "bg-amber-50",
            },
          ].map((r) => (
            <a
              key={r.title}
              href={orgId ? r.href : "#"}
              onClick={(e) => { if (!orgId) e.preventDefault(); }}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
            >
              <div className={`${r.bg} p-2.5 rounded-lg flex-shrink-0`}>
                <r.icon className={`h-4 w-4 ${r.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 leading-tight">{r.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
              </div>
              <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
            </a>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          Reports include completed &amp; paid jobs only. Depth follows the selected time range above.
        </p>
      </div>
    </div>
  );
}
