"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2, MapPin, Users, Wallet, PieChart, Plus, Briefcase,
  ChevronRight, TrendingUp, ShieldAlert, Clock, AlertTriangle, BarChart2,
  CreditCard, Shield, ReceiptText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgApiResponse { org: IBusinessOrganization | null }

interface DashboardSnapshot {
  kpi: {
    activeJobs: number;
    inProgress: number;
    disputesOpen: number;
    monthlySpend: number;
    totalBudget: number;
    budgetRemaining: number;
    escrowBalance: number;
  };
  spendTrend: { month: string; spend: number }[];
  categoryBreakdown: Record<string, number>;
  topProviders: { id: string; name: string; avatar: string | null; totalJobs: number; completedJobs: number; totalSpend: number }[];
  branchBudget: { label: string; budget: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6",
];

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

function SpendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600">{label}</p>
      <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BusinessHubClient() {
  const [org, setOrg]                 = useState<IBusinessOrganization | null>(null);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [form, setForm]               = useState({ name: "", type: "company" as "hotel" | "company" | "other" });
  const [showCreate, setShowCreate]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [snap, setSnap]               = useState<DashboardSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<OrgApiResponse>("/api/business/org");
      setOrg(data.org);
      if (data.org) {
        setSnapLoading(true);
        try {
          const s = await fetchClient<DashboardSnapshot>(
            `/api/business/dashboard?orgId=${data.org._id}`
          );
          setSnap(s);
        } catch { /* silent */ } finally {
          setSnapLoading(false);
        }
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrg(); }, [loadOrg]);

  async function handleCreate() {
    if (!form.name.trim()) return setError("Organization name is required.");
    setCreating(true); setError(null);
    try {
      const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/org", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setOrg(data.org);
      setShowCreate(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create organization.");
    } finally {
      setCreating(false);
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 bg-slate-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <div key={i} className="h-56 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── No org ───────────────────────────────────────────────────────────────
  if (!org && !showCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="bg-primary/10 ring-4 ring-primary/10 p-5 rounded-2xl">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">No Business Profile Yet</h2>
          <p className="text-slate-500 mt-1.5 max-w-sm text-sm leading-relaxed">
            Set up your business organization to manage multiple locations, team members,
            budgets, and provider analytics — all in one place.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Business Profile
        </button>
      </div>
    );
  }

  // ── Create form ──────────────────────────────────────────────────────────
  if (!org && showCreate) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create Business Profile</h2>
          <p className="text-sm text-slate-400 mt-0.5">Fill in your organization details below.</p>
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
        )}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Organization Name *
            </label>
            <input
              className="input w-full"
              placeholder="e.g. Grand Plaza Hotel Group"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              className="input w-full"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
            >
              <option value="company">Company</option>
              <option value="hotel">Hotel</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
            {creating ? "Creating…" : "Create Organization"}
          </button>
          <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  const totalBudget     = org!.locations.reduce((s, l) => s + l.monthlyBudget, 0);
  const activeLocations = org!.locations.filter((l) => l.isActive).length;
  const kpi             = snap?.kpi;
  const budgetPct       = totalBudget > 0
    ? Math.min(100, Math.round(((kpi?.monthlySpend ?? 0) / totalBudget) * 100))
    : 0;

  const catEntries = Object.entries(snap?.categoryBreakdown ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const catMax   = catEntries[0]?.[1] ?? 1;
  const branchMax = Math.max(...(snap?.branchBudget.map((b) => b.budget) ?? [1]), 1);
  const provMax   = Math.max(...(snap?.topProviders.map((p) => p.totalJobs) ?? [1]), 1);

  const KPI_CARDS = [
    { label: "Active Jobs",       value: kpi?.activeJobs ?? 0,                       icon: Briefcase,    color: "text-blue-600",    bg: "bg-blue-50",    ring: "ring-blue-100",    sub: "open + assigned + in progress" },
    { label: "In Progress",       value: kpi?.inProgress ?? 0,                       icon: Clock,        color: "text-violet-600",  bg: "bg-violet-50",  ring: "ring-violet-100",  sub: "currently being worked" },
    { label: "Escrow Balance",    value: formatCurrency(kpi?.escrowBalance ?? 0),    icon: ShieldAlert,  color: "text-amber-600",   bg: "bg-amber-50",   ring: "ring-amber-100",   sub: "funds held in escrow" },
    { label: "Monthly Spend",     value: formatCurrency(kpi?.monthlySpend ?? 0),     icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100", sub: "this month" },
    {
      label: "Budget Remaining",
      value: formatCurrency(kpi?.budgetRemaining ?? 0),
      icon: Wallet,
      color: budgetPct >= 90 ? "text-red-600" : budgetPct >= 70 ? "text-amber-600" : "text-slate-600",
      bg: budgetPct >= 90 ? "bg-red-50" : budgetPct >= 70 ? "bg-amber-50" : "bg-slate-50",
      ring: budgetPct >= 90 ? "ring-red-100" : budgetPct >= 70 ? "ring-amber-100" : "ring-slate-100",
      sub: `${budgetPct}% of budget used`,
    },
    {
      label: "Disputes Open",
      value: kpi?.disputesOpen ?? 0,
      icon: AlertTriangle,
      color: (kpi?.disputesOpen ?? 0) > 0 ? "text-red-600" : "text-slate-400",
      bg: (kpi?.disputesOpen ?? 0) > 0 ? "bg-red-50" : "bg-slate-50",
      ring: (kpi?.disputesOpen ?? 0) > 0 ? "ring-red-100" : "ring-slate-100",
      sub: "requiring attention",
    },
  ];

  const NAV_CARDS = [
    { label: "Locations",    value: String(activeLocations), sub: "active branches",    icon: MapPin,      href: "/client/business/locations",  color: "text-blue-600",    bg: "bg-blue-50",    ring: "ring-blue-100" },
    { label: "Team Members", value: "Manage",                sub: "role-based access",  icon: Users,       href: "/client/business/members",    color: "text-violet-600",  bg: "bg-violet-50",  ring: "ring-violet-100" },
    { label: "Budget",       value: formatCurrency(totalBudget), sub: "total / mo",     icon: Wallet,      href: "/client/business/budget",     color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
    { label: "Analytics",    value: "View",                  sub: "spend & performance", icon: PieChart,   href: "/client/business/analytics",  color: "text-amber-600",   bg: "bg-amber-50",   ring: "ring-amber-100" },
    { label: "Jobs",         value: String(kpi?.activeJobs ?? 0), sub: "active this month", icon: Briefcase, href: "/client/business/jobs",       color: "text-sky-600",     bg: "bg-sky-50",     ring: "ring-sky-100" },
    { label: "Escrow",       value: "Manage",                sub: "funded & released",  icon: CreditCard,  href: "/client/business/escrow",     color: "text-teal-600",    bg: "bg-teal-50",    ring: "ring-teal-100" },
    { label: "Disputes",     value: String(kpi?.disputesOpen ?? 0), sub: "open cases",  icon: Shield,      href: "/client/business/disputes",   color: "text-orange-600",  bg: "bg-orange-50",  ring: "ring-orange-100" },
    { label: "Billing",      value: "Manage",                sub: "plan & commission",   icon: ReceiptText, href: "/client/business/billing",    color: "text-rose-600",    bg: "bg-rose-50",    ring: "ring-rose-100" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        {org!.logo ? (
          <Image src={org!.logo} alt="logo" width={56} height={56} className="h-14 w-14 rounded-full object-cover ring-4 ring-primary/10 flex-shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-primary/10 ring-4 ring-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{org!.name}</h1>
          <p className="text-sm text-slate-500 capitalize mt-0.5">
            {org!.type} account · {activeLocations} active branch{activeLocations !== 1 ? "es" : ""}
          </p>
        </div>
      </div>

      {/* ── KPI Widgets ── */}
      {snapLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {KPI_CARDS.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className={`${c.bg} ring-4 ${c.ring} p-2 rounded-xl w-fit`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className={`text-xl font-bold leading-tight mt-0.5 ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Budget utilization bar ── */}
      {!snapLoading && totalBudget > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-700">Monthly Budget Utilization</p>
              <p className={`text-xs font-bold tabular-nums ${budgetPct >= 90 ? "text-red-600" : budgetPct >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
                {budgetPct}%
              </p>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-slate-400">{formatCurrency(kpi?.monthlySpend ?? 0)} spent</p>
              <p className="text-[11px] text-slate-400">{formatCurrency(totalBudget)} total</p>
            </div>
          </div>
          {budgetPct >= 80 && (
            <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {budgetPct >= 90 ? "Budget critical" : "Budget warning"}
            </div>
          )}
        </div>
      )}

      {/* ── Charts 2×2 ── */}
      {!snapLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Monthly Spend Trend */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">Monthly Spend Trend</h2>
            </div>
            {(snap?.spendTrend?.length ?? 0) === 0 || snap?.spendTrend.every((r) => r.spend === 0) ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BarChart2 className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No spend data yet</p>
              </div>
            ) : (
              <div className="px-4 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={snap!.spendTrend} barSize={28}>
                    <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip content={<SpendTooltip />} />
                    <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                      {snap!.spendTrend.map((_, i) => (
                        <Cell key={i} fill={i === snap!.spendTrend.length - 1 ? "#6366f1" : "#e0e7ff"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Spending by Category */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <PieChart className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">Spending by Category <span className="text-slate-400 font-normal">(this month)</span></h2>
            </div>
            {catEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <PieChart className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No category data yet</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-2.5">
                {catEntries.map(([cat, amount], i) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="font-medium text-slate-700 truncate max-w-[140px]">{cat}</span>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(amount)}</span>
                    </div>
                    <PctBar value={amount} max={catMax} color={CAT_COLORS[i % CAT_COLORS.length]} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 Providers by Volume */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800 text-sm">Top Providers by Volume</h2>
              </div>
              <Link href="/client/business/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
                Full report <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {(snap?.topProviders.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No provider data yet</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {snap!.topProviders.map((p, i) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-bold text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      {p.avatar ? (
                        <Image src={p.avatar} alt={p.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-primary">{p.name[0]}</span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-slate-700 flex-1 min-w-0 truncate">{p.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-semibold text-slate-900 tabular-nums">{p.totalJobs} jobs</span>
                        <span className="text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">{p.completedJobs} done</span>
                      </div>
                    </div>
                    <PctBar value={p.totalJobs} max={provMax} color="#6366f1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget per Branch */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800 text-sm">Budget per Branch</h2>
              </div>
              <Link href="/client/business/budget" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {(snap?.branchBudget.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <MapPin className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No branch budget set</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-2.5">
                {snap!.branchBudget.map((b, i) => (
                  <div key={b.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{b.label}</span>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(b.budget)}<span className="text-slate-400 font-normal">/mo</span>
                      </span>
                    </div>
                    <PctBar value={b.budget} max={branchMax} color={CAT_COLORS[i % CAT_COLORS.length]} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Quick-nav cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {NAV_CARDS.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`${c.bg} ring-4 ${c.ring} p-2.5 rounded-xl`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
