"use client";

import { useEffect, useState } from "react";
import {
  Users, Briefcase, CheckCircle, CircleDollarSign,
  TrendingUp, Star, Tag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalProviders: number;
  newProvidersThisMonth: number;
  activeJobs: number;
  completedJobs: number;
  totalIncomeGenerated: number;
  avgProviderIncome: number;
  topSkills: { skill: string; count: number }[];
  topCategories: { category: string; count: number }[];
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PesoDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/peso/dashboard")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Co-branding banner */}
      <div className="bg-blue-700 rounded-xl px-6 py-4 flex items-center gap-3">
        <div className="text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            LGU Employment Partner
          </p>
          <p className="text-xl font-bold mt-0.5">PESO Officer Dashboard</p>
          <p className="text-sm opacity-75 mt-0.5">
            Supported by LocalPro — Digital Workforce Management
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Registered Providers"
          value={stats.totalProviders.toLocaleString()}
          sub={`+${stats.newProvidersThisMonth} this month`}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Active Jobs"
          value={stats.activeJobs.toLocaleString()}
          icon={<Briefcase className="h-5 w-5 text-amber-600" />}
          color="bg-amber-50"
        />
        <StatCard
          label="Jobs Completed"
          value={stats.completedJobs.toLocaleString()}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-50"
        />
        <StatCard
          label="Total Provider Income"
          value={formatCurrency(stats.totalIncomeGenerated)}
          sub="Net earnings released to providers"
          icon={<CircleDollarSign className="h-5 w-5 text-violet-600" />}
          color="bg-violet-50"
        />
        <StatCard
          label="Avg Provider Income"
          value={formatCurrency(stats.avgProviderIncome)}
          sub="Per registered provider"
          icon={<TrendingUp className="h-5 w-5 text-pink-600" />}
          color="bg-pink-50"
        />
        <StatCard
          label="New Providers (This Month)"
          value={stats.newProvidersThisMonth.toLocaleString()}
          icon={<Star className="h-5 w-5 text-sky-600" />}
          color="bg-sky-50"
        />
      </div>

      {/* Top skills + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-500" /> Top In-Demand Skills
          </h3>
          <ul className="space-y-2">
            {stats.topSkills.map((s, i) => (
              <li key={s.skill} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-5 text-slate-400 text-xs font-mono">{i + 1}.</span>
                  <span className="text-slate-700">{s.skill}</span>
                </span>
                <span className="text-slate-400 text-xs">{s.count} providers</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" /> Top Service Categories
          </h3>
          <ul className="space-y-2">
            {stats.topCategories.map((c, i) => (
              <li key={c.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-5 text-slate-400 text-xs font-mono">{i + 1}.</span>
                  <span className="text-slate-700">{c.category}</span>
                </span>
                <span className="text-slate-400 text-xs">{c.count} jobs</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
