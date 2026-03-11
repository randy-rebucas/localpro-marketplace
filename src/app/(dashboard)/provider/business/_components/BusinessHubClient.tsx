"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2, Users, Briefcase, ChevronRight, TrendingUp, Clock,
  Star, CheckCircle2, DollarSign, Plus, MapPin, PieChart,
  BarChart2, Settings,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyProfile {
  _id: string;
  name: string;
  type: "agency" | "company" | "other";
  logo?: string;
  description?: string;
  serviceAreas: string[];
}

interface AgencyApiResponse { agency: AgencyProfile | null }

interface DashboardSnapshot {
  kpi: {
    activeJobs: number;
    inProgress: number;
    completedThisMonth: number;
    staffCount: number;
    monthlyRevenue: number;
    avgRating: number;
    completionRate: number;
    pendingPayouts: number;
  };
  revenueTrend: { month: string; revenue: number }[];
  jobsByCategory: Record<string, number>;
  topStaff: { id: string; name: string; avatar: string | null; completedJobs: number; rating: number }[];
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

export default function BusinessHubClient() {
  const [profile, setProfile]         = useState<AgencyProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [form, setForm]               = useState({ name: "", type: "agency" as "agency" | "company" | "other" });
  const [showCreate, setShowCreate]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [snap, setSnap]               = useState<DashboardSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<AgencyApiResponse>("/api/provider/agency/profile");
      setProfile(data.agency);
      if (data.agency) {
        setSnapLoading(true);
        try {
          const s = await fetchClient<DashboardSnapshot>(
            `/api/provider/agency/dashboard?agencyId=${data.agency._id}`
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

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleCreate() {
    if (!form.name.trim()) return setError("Organization name is required.");
    setCreating(true); setError(null);
    try {
      const data = await fetchClient<{ agency: AgencyProfile }>("/api/provider/agency/profile", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setProfile(data.agency);
      setShowCreate(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create agency profile.");
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

  // ── No agency profile ─────────────────────────────────────────────────────
  if (!profile && !showCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="bg-primary/10 ring-4 ring-primary/10 p-5 rounded-2xl">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">No Agency Profile Yet</h2>
          <p className="text-slate-500 mt-1.5 max-w-sm text-sm leading-relaxed">
            Set up your agency profile to manage staff, dispatch jobs, track revenue,
            and run your service business — all in one place.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Agency Profile
        </button>
      </div>
    );
  }

  // ── Create form ──────────────────────────────────────────────────────────
  if (!profile && showCreate) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create Agency Profile</h2>
          <p className="text-sm text-slate-400 mt-0.5">Fill in your agency details below.</p>
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
              placeholder="e.g. Cebu Pro Services Agency"
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
              <option value="agency">Agency</option>
              <option value="company">Company</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
            {creating ? "Creating…" : "Create Agency"}
          </button>
          <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  const kpi = snap?.kpi;

  const catEntries = Object.entries(snap?.jobsByCategory ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const catMax = catEntries[0]?.[1] ?? 1;

  const staffMax = Math.max(...(snap?.topStaff.map((s) => s.completedJobs) ?? [1]), 1);

  const KPI_CARDS = [
    { label: "Active Jobs",       value: kpi?.activeJobs ?? 0,                     icon: Briefcase,    color: "text-blue-600",    bg: "bg-blue-50",    ring: "ring-blue-100",    sub: "open + assigned",    href: "/provider/business/jobs" },
    { label: "In Progress",       value: kpi?.inProgress ?? 0,                     icon: Clock,        color: "text-violet-600",  bg: "bg-violet-50",  ring: "ring-violet-100",  sub: "being worked on",    href: "/provider/business/jobs" },
    { label: "Completed",         value: kpi?.completedThisMonth ?? 0,             icon: CheckCircle2, color: "text-teal-600",    bg: "bg-teal-50",    ring: "ring-teal-100",    sub: "this month",         href: "/provider/business/jobs" },
    { label: "Staff",             value: kpi?.staffCount ?? 0,                     icon: Users,        color: "text-sky-600",     bg: "bg-sky-50",     ring: "ring-sky-100",     sub: "team members",       href: "/provider/business/staff" },
    { label: "Monthly Revenue",   value: formatCurrency(kpi?.monthlyRevenue ?? 0), icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100", sub: "this month",         href: "/provider/business/earnings" },
    { label: "Avg Rating",        value: `${(kpi?.avgRating ?? 0).toFixed(1)} ★`,  icon: Star,         color: "text-amber-600",   bg: "bg-amber-50",   ring: "ring-amber-100",   sub: "across all staff",   href: "/provider/business/reviews" },
    { label: "Completion Rate",   value: `${kpi?.completionRate ?? 0}%`,            icon: CheckCircle2, color: "text-teal-600",    bg: "bg-teal-50",    ring: "ring-teal-100",    sub: "overall rate",       href: "/provider/business/analytics" },
    { label: "Pending Payouts",   value: formatCurrency(kpi?.pendingPayouts ?? 0), icon: DollarSign,   color: "text-orange-600",  bg: "bg-orange-50",  ring: "ring-orange-100",  sub: "awaiting release",   href: "/provider/business/earnings" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {profile!.logo ? (
            <Image
              src={profile!.logo}
              alt="logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary/10 flex-shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 ring-2 ring-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{profile!.name}</h1>
            <p className="text-xs text-slate-500 capitalize mt-0.5">
              <span className="font-medium">{profile!.type}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              {kpi?.staffCount ?? 0} staff
              <span className="mx-1.5 text-slate-300">·</span>
              {profile!.serviceAreas.length} area{profile!.serviceAreas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link
          href="/provider/business/profile"
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          <Settings className="h-3.5 w-3.5" /> Edit Profile
        </Link>
      </div>

      {/* ── KPI Widgets ── */}
      {snapLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {KPI_CARDS.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className={`${c.bg} ring-4 ${c.ring} p-2 rounded-xl w-fit`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className={`text-xl font-bold leading-tight mt-0.5 ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{c.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Charts ── */}
      {!snapLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Monthly Revenue Trend */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800 text-sm">Monthly Revenue</h2>
              </div>
              <Link href="/provider/business/earnings" className="text-xs text-primary hover:underline flex items-center gap-1">
                View earnings <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {(snap?.revenueTrend?.length ?? 0) === 0 || snap?.revenueTrend.every((r) => r.revenue === 0) ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BarChart2 className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No revenue data yet</p>
              </div>
            ) : (
              <div className="px-4 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={snap!.revenueTrend} barSize={24}>
                    <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<RevenueTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                      {snap!.revenueTrend.map((_, i) => (
                        <Cell key={i} fill={i === snap!.revenueTrend.length - 1 ? "#6366f1" : "#e0e7ff"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Jobs by Category */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800 text-sm">
                  Jobs by Category <span className="text-slate-400 font-normal text-xs">(this month)</span>
                </h2>
              </div>
              <Link href="/provider/business/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
                Analytics <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {catEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <PieChart className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No category data yet</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {catEntries.map(([cat, count], i) => (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="font-medium text-slate-700 truncate max-w-[140px]">{cat}</span>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums">{count} job{count !== 1 ? "s" : ""}</span>
                    </div>
                    <PctBar value={count} max={catMax} color={CAT_COLORS[i % CAT_COLORS.length]} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Staff */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800 text-sm">Top Staff</h2>
              </div>
              <Link href="/provider/business/staff" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage staff <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {(snap?.topStaff.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No staff added yet</p>
                <Link href="/provider/business/staff" className="text-xs text-primary hover:underline">Add team members →</Link>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {snap!.topStaff.map((s, i) => (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-bold text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      {s.avatar ? (
                        <Image src={s.avatar} alt={s.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-primary">{s.name[0]}</span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-slate-700 flex-1 min-w-0 truncate">{s.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-semibold text-slate-600 tabular-nums">{s.completedJobs} done</span>
                        <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-1.5 py-0.5 rounded-full">{s.rating.toFixed(1)} ★</span>
                      </div>
                    </div>
                    <PctBar value={s.completedJobs} max={staffMax} color="#6366f1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service Coverage */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800 text-sm">Service Coverage</h2>
              </div>
              <Link href="/provider/business/service-areas" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {profile!.serviceAreas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <MapPin className="h-7 w-7 text-slate-300" />
                <p className="text-sm text-slate-400">No service areas set</p>
                <Link href="/provider/business/service-areas" className="text-xs text-primary hover:underline">Add areas →</Link>
              </div>
            ) : (
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {profile!.serviceAreas.map((area) => (
                  <span key={area} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                    <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-700">{area}</span>
                  </span>
                ))}
                <Link
                  href="/provider/business/service-areas"
                  className="inline-flex items-center gap-1 text-xs text-primary border border-primary/20 bg-primary/5 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add area
                </Link>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
