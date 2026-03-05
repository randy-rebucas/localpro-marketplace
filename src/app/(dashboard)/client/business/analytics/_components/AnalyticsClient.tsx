"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, Star, User, Download, Star as StarIcon,
  CheckCircle, AlertTriangle, Briefcase, BarChart2,
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
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>("");

  const load = useCallback(async (m = months) => {
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
  }, [months]);

  useEffect(() => { load(); }, [load]);

  function handleMonthsChange(m: number) {
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
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">
            Expense trends and provider performance for <strong>{org.name}</strong>.
          </p>
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
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Delay %</th>
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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.providerAvatar} alt="avatar"
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
                      "text-slate-600"
                    }`}>
                      {p.delayFrequency.toFixed(0)}%
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
                        <StarIcon className={`h-4 w-4 ${p.isPreferred ? "fill-amber-400" : ""}`} />
                      </button>
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
