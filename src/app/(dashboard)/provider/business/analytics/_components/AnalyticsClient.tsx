"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TrendingUp, PieChart, BarChart2, Users, RefreshCw,
  Clock, Repeat, Star, Briefcase, DollarSign, AlertCircle,
  Lock, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchClient } from "@/lib/fetchClient";
import { hasAnalyticsAccess, PLAN_LABELS, PLAN_UPGRADE_NEXT } from "@/lib/businessPlan";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyProfile {
  _id: string;
  name: string;
  plan: "starter" | "growth" | "pro" | "enterprise";
}

interface KPI {
  totalJobs:    number;
  totalRevenue: number;
  avgRating:    number | null;
  totalReviews: number;
}

interface PeakSlot {
  label:   string;
  count:   number;
  percent: number;
}

interface AnalyticsData {
  agencyName:          string;
  kpi:                 KPI;
  revenueTrend:        { month: string; revenue: number }[];
  categoryBreakdown:   Record<string, number>;
  staffPerformance:    {
    id:            string;
    name:          string;
    avatar:        string | null;
    role:          string;
    completedJobs: number;
    avgRating:     number | null;
    reviewCount:   number;
  }[];
  clientRetentionRate: number | null;
  peakHours:           PeakSlot[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

const PEAK_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#94a3b8"];

function shortMonth(m: string) {
  const [year, mon] = m.split("-");
  const d = new Date(Number(year), Number(mon) - 1, 1);
  return d.toLocaleString("default", { month: "short" });
}

function PctBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600">{label}</p>
      <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const [agency, setAgency]       = useState<AgencyProfile | null>(null);
  const [data, setData]           = useState<AnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [months, setMonths]       = useState(6);

  const load = useCallback(async (m = months) => {
    setLoading(true);
    setLoadError(false);
    try {
      const agencyData = await fetchClient<{ agency: AgencyProfile | null }>("/api/provider/agency/profile");
      if (agencyData.agency) setAgency(agencyData.agency);

      // Skip analytics fetch if plan doesn't have access
      if (!agencyData.agency || !hasAnalyticsAccess(agencyData.agency.plan)) {
        setLoading(false);
        return;
      }

      const res = await fetchClient<AnalyticsData>(`/api/provider/agency/analytics?months=${m}`);
      setData(res);
    } catch {
      setLoadError(true);
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

  // ── Error screen ──────────────────────────────────────────────────────────
  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">Failed to load analytics</p>
        <button onClick={() => load()} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-56 bg-slate-200 rounded-2xl" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── Plan gate: Analytics requires Growth or higher ───────────────────────────────
  if (agency && !hasAnalyticsAccess(agency.plan)) {
    const nextPlan = PLAN_UPGRADE_NEXT[agency.plan];
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Lock className="h-7 w-7 text-amber-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-lg font-bold text-slate-800">Analytics &amp; Insights</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Performance metrics, revenue trends, and staff analytics are available on the{" "}
            <strong>Growth, Pro,</strong> and <strong>Enterprise</strong> plans.
            Your current plan is <strong>{PLAN_LABELS[agency.plan]}</strong>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {nextPlan && (
            <a
              href="/provider/business/plan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
            >
              Upgrade to {PLAN_LABELS[nextPlan]}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          <a
            href="/provider/business"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
        {/* Preview of what they'll unlock */}
        <div className="grid sm:grid-cols-3 gap-4 mt-4 w-full max-w-xl opacity-40 pointer-events-none select-none">
          {[
            { icon: TrendingUp, label: "Revenue Trends" },
            { icon: BarChart2, label: "Category Breakdown" },
            { icon: Users, label: "Staff Performance" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200">
              <Icon className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <BarChart2 className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No agency profile found.{" "}
          <Link href="/provider/business" className="text-primary underline">Create one first.</Link>
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <BarChart2 className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">No analytics data available.</p>
      </div>
    );
  }

  const { kpi, revenueTrend, categoryBreakdown, staffPerformance, clientRetentionRate, peakHours } = data;
  const catEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const catMax     = catEntries[0]?.[1] ?? 1;
  const ROLE_LABELS: Record<string, string> = {
    worker: "Worker", dispatcher: "Dispatcher",
    supervisor: "Supervisor", finance: "Finance",
  };
  const score = clientRetentionRate ?? 0;

  // MoM revenue change from last 2 trend entries
  const lastRev  = revenueTrend.at(-1)?.revenue ?? 0;
  const prevRev  = revenueTrend.at(-2)?.revenue ?? 0;
  const momRev   = prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : null;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <PieChart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Analytics</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Performance overview for {data.agencyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={<Briefcase className="h-5 w-5 text-primary" />}
          bg="bg-primary/10"
          label="Jobs Completed"
          value={String(kpi.totalJobs)}
          sub={`last ${months} month${months !== 1 ? "s" : ""}`}
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          bg="bg-emerald-50"
          label="Revenue Earned"
          value={formatCurrency(kpi.totalRevenue)}
          sub={`last ${months} month${months !== 1 ? "s" : ""}`}
          badge={momRev != null ? (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              momRev >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}>
              {momRev >= 0 ? "+" : ""}{momRev}% MoM
            </span>
          ) : undefined}
        />
        <KpiCard
          icon={<Star className="h-5 w-5 text-amber-500" />}
          bg="bg-amber-50"
          label="Avg Rating"
          value={kpi.avgRating != null ? `${kpi.avgRating} ★` : "—"}
          sub={kpi.totalReviews > 0 ? `${kpi.totalReviews} reviews` : "no reviews yet"}
        />
        <KpiCard
          icon={<Repeat className="h-5 w-5 text-violet-600" />}
          bg="bg-violet-50"
          label="Retention Rate"
          value={clientRetentionRate != null ? `${clientRetentionRate}%` : "—"}
          sub="repeat clients"
        />
      </div>

      {/* ── Revenue Trend Chart ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">Revenue Trend</h2>
        </div>
        {revenueTrend.every((r) => r.revenue === 0) ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BarChart2 className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-400">No revenue data for this period.</p>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueTrend} barSize={32}>
                <XAxis
                  dataKey="month"
                  tickFormatter={shortMonth}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false} width={44}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {revenueTrend.map((_, i) => (
                    <Cell key={i} fill={i === revenueTrend.length - 1 ? "#6366f1" : "#e0e7ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 2×2 Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Jobs by Category */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <PieChart className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">Jobs by Category</h2>
          </div>
          {catEntries.length === 0 ? (
            <EmptyState icon={<PieChart className="h-7 w-7 text-slate-300" />} message="No category data yet." />
          ) : (
            <div className="px-5 py-4 space-y-2.5">
              {catEntries.map(([cat, count], i) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="font-medium text-slate-700 truncate max-w-[140px]">{cat}</span>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums">{count} jobs</span>
                  </div>
                  <PctBar value={count} max={catMax} color={CAT_COLORS[i % CAT_COLORS.length]} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">Staff Performance</h2>
          </div>
          {staffPerformance.length === 0 ? (
            <EmptyState icon={<Users className="h-7 w-7 text-slate-300" />} message="No staff registered to this agency yet." />
          ) : (
            <div className="divide-y divide-slate-50">
              {staffPerformance.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  {s.avatar ? (
                    <Image src={s.avatar} alt={s.name} width={32} height={32}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary flex-shrink-0">
                      {s.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{s.completedJobs} jobs</span>
                      {s.avgRating != null && (
                        <span className="text-[10px] text-amber-500">★ {s.avgRating}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize flex-shrink-0">
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                </div>
              ))}
              <p className="px-5 py-3 text-[11px] text-slate-400">
                Manage staff roles in the{" "}
                <Link href="/provider/business/staff" className="text-primary hover:underline">Staff</Link> tab.
              </p>
            </div>
          )}
        </div>

        {/* Client Retention */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Repeat className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">Client Retention</h2>
          </div>
          <div className="px-5 py-6 flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={score >= 60 ? "#10b981" : score >= 30 ? "#f59e0b" : "#6366f1"}
                    strokeWidth="3"
                    strokeDasharray={`${score} ${100 - score}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-sm font-bold text-slate-800">
                  {clientRetentionRate != null ? `${clientRetentionRate}%` : "—"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Repeat Clients</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Clients who booked your agency more than once in the selected period.
              </p>
              {clientRetentionRate == null ? (
                <p className="text-xs text-slate-400 mt-2">No data yet for this period.</p>
              ) : score >= 60 ? (
                <p className="text-xs text-emerald-600 font-semibold mt-2">Excellent retention</p>
              ) : score >= 30 ? (
                <p className="text-xs text-amber-600 font-semibold mt-2">Average retention</p>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Build client relationships to improve</p>
              )}
            </div>
          </div>
        </div>

        {/* Peak Service Hours */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">Peak Service Hours</h2>
          </div>
          {peakHours.every((p) => p.count === 0) ? (
            <EmptyState icon={<Clock className="h-7 w-7 text-slate-300" />} message="Not enough job data yet." />
          ) : (
            <div className="px-5 py-5 space-y-3">
              {peakHours.map((slot, i) => (
                <div key={slot.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{slot.label}</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {slot.percent}%
                      <span className="text-slate-400 font-normal ml-1">({slot.count} jobs)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${slot.percent}%`, background: PEAK_COLORS[i] }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 pt-1">
                Based on job creation times — updates as more jobs are recorded.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon, bg, label, value, sub, badge,
}: {
  icon:    React.ReactNode;
  bg:      string;
  label:   string;
  value:   string;
  sub?:    string;
  badge?:  React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
          {badge}
        </div>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {icon}
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
