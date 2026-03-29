"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Briefcase, CheckCircle, CircleDollarSign,
  TrendingUp, Tag, ArrowRight, FileBarChart, ClipboardList,
  UserSearch,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";

interface DashboardStats {
  totalProviders: number;
  newProvidersThisMonth: number;
  activeJobs: number;
  completedJobs: number;
  totalIncomeGenerated: number;
  avgProviderIncome: number;
  topSkills: { skill: string; count: number }[];
  topCategories: { category: string; count: number }[];
  officeName: string;
  municipality: string;
  region: string;
}

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function BarList({ items, labelKey, valueKey, suffix = "" }: {
  items: object[];
  labelKey: string;
  valueKey: string;
  suffix?: string;
}) {
  const get = (item: object, key: string) => (item as Record<string, unknown>)[key];
  const max = Math.max(...items.map((i) => Number(get(i, valueKey)) || 0), 1);
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">{i + 1}.</span>
          <div className="min-w-0">
            <p className="text-sm text-slate-700 truncate mb-1">{String(get(item, labelKey))}</p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(Number(get(item, valueKey)) / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            {Number(get(item, valueKey))}{suffix}
          </span>
        </li>
      ))}
    </ul>
  );
}

const QUICK_LINKS = [
  { href: "/peso/workforce", label: "Workforce Registry", desc: "Browse registered workers", icon: UserSearch, color: "text-blue-600 bg-blue-50" },
  { href: "/peso/jobs", label: "Post a Job", desc: "Create LGU job listings", icon: ClipboardList, color: "text-amber-600 bg-amber-50" },
  { href: "/peso/reports", label: "Reports", desc: "Analytics & export", icon: FileBarChart, color: "text-violet-600 bg-violet-50" },
];

export default function PesoDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch("/api/peso/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then((d) => setStats(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-blue-700/20 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600">
        Failed to load dashboard data. Please refresh the page.
      </div>
    );
  }

  if (!stats) return null;

  const topSkills = stats.topSkills ?? [];
  const topCategories = stats.topCategories ?? [];

  return (
    <div className="space-y-6">
      {/* ── Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-blue-800 rounded-2xl px-6 py-5 shadow-md">
        {/* decorative ring */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">
            LGU Employment Partner · LocalPro
          </p>
          <p className="text-2xl font-extrabold text-white">{stats.officeName}</p>
          <p className="text-sm text-blue-200 mt-1">
            {stats.municipality}, {stats.region}
          </p>
          <p className="text-xs text-blue-300/70 mt-1.5">
            Showing data scoped to your PESO office only
          </p>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Employment Metrics — {stats.municipality}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Registered Providers"
            value={(stats.totalProviders ?? 0).toLocaleString()}
            sub={`+${stats.newProvidersThisMonth ?? 0} new this month`}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Active Jobs"
            value={(stats.activeJobs ?? 0).toLocaleString()}
            sub="currently open or in progress"
            icon={<Briefcase className="h-5 w-5 text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Jobs Completed"
            value={(stats.completedJobs ?? 0).toLocaleString()}
            sub="all time"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            color="bg-emerald-50"
          />
          <StatCard
            label="Total Provider Income"
            value={formatCurrency(stats.totalIncomeGenerated ?? 0)}
            sub="net earnings released to providers"
            icon={<CircleDollarSign className="h-5 w-5 text-violet-600" />}
            color="bg-violet-50"
          />
          <StatCard
            label="Avg Income per Provider"
            value={formatCurrency(stats.avgProviderIncome ?? 0)}
            sub="across all registered providers"
            icon={<TrendingUp className="h-5 w-5 text-pink-600" />}
            color="bg-pink-50"
          />
          <StatCard
            label="New This Month"
            value={(stats.newProvidersThisMonth ?? 0).toLocaleString()}
            sub="provider registrations"
            icon={<Users className="h-5 w-5 text-sky-600" />}
            color="bg-sky-50"
          />
        </div>
      </div>

      {/* ── Skills + Categories ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-sm">
            <Tag className="h-4 w-4 text-blue-500" />
            Top In-Demand Skills
          </h3>
          {topSkills.length > 0 ? (
            <BarList
              items={topSkills }
              labelKey="skill"
              valueKey="count"
              suffix=" providers"
            />
          ) : (
            <p className="text-sm text-slate-400">No skill data yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-blue-500" />
            Top Service Categories
          </h3>
          {topCategories.length > 0 ? (
            <BarList
              items={topCategories }
              labelKey="category"
              valueKey="count"
              suffix=" jobs"
            />
          ) : (
            <p className="text-sm text-slate-400">No category data yet.</p>
          )}
        </div>
      </div>

      {/* ── Quick links ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Quick Access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-md transition-all shadow-sm"
            >
              <div className={`p-2 rounded-lg shrink-0 ${l.color}`}>
                <l.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{l.label}</p>
                <p className="text-xs text-slate-400 truncate">{l.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}