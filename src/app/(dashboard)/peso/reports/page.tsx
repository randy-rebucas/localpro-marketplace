"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileBarChart, Users, Briefcase, CircleDollarSign, Star, TrendingUp, Download } from "lucide-react";

interface Stats {
  totalProviders: number;
  newProvidersThisMonth: number;
  activeJobs: number;
  completedJobs: number;
  totalIncomeGenerated: number;
  avgProviderIncome: number;
}

interface SkillEntry { skill: string; count: number }
interface CategoryEntry { category: string; count: number }

interface ReportData {
  stats: Stats;
  topSkills: SkillEntry[];
  topCategories: CategoryEntry[];
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function BarList({ items, valueKey, labelKey }: { items: Record<string, unknown>[]; valueKey: string; labelKey: string }) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-center gap-3">
          <span className="text-sm text-slate-600 w-32 shrink-0 truncate">{String(item[labelKey])}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(Number(item[valueKey]) / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 w-8 text-right">{Number(item[valueKey])}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/peso/reports")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load reports");
        return r.json();
      })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Providers", data.stats.totalProviders],
      ["New This Month", data.stats.newProvidersThisMonth],
      ["Active Jobs", data.stats.activeJobs],
      ["Completed Jobs", data.stats.completedJobs],
      ["Total Earnings (PHP)", data.stats.totalIncomeGenerated],
      ["Avg Provider Income (PHP)", data.stats.avgProviderIncome],
      [],
      ["Top Skills", "Count"],
      ...data.topSkills.map((s) => [s.skill, s.count]),
      [],
      ["Top Categories", "Count"],
      ...data.topCategories.map((c) => [c.category, c.count]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peso-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-white rounded-xl border border-slate-200" />
          <div className="h-48 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, topSkills, topCategories } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-blue-600" />
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Employment metrics and workforce data for your PESO office.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Employment metrics */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Employment Metrics</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Providers"
            value={(stats.totalProviders ?? 0).toLocaleString()}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="New This Month"
            value={(stats.newProvidersThisMonth ?? 0).toLocaleString()}
            icon={<TrendingUp className="h-4 w-4" />}
            sub="provider registrations"
          />
          <StatCard
            label="Active Jobs"
            value={(stats.activeJobs ?? 0).toLocaleString()}
            icon={<Briefcase className="h-4 w-4" />}
            sub="currently open"
          />
          <StatCard
            label="Completed Jobs"
            value={(stats.completedJobs ?? 0).toLocaleString()}
            icon={<Briefcase className="h-4 w-4" />}
            sub="all time"
          />
          <StatCard
            label="Total Earnings"
            value={`₱${(stats.totalIncomeGenerated ?? 0).toLocaleString()}`}
            icon={<CircleDollarSign className="h-4 w-4" />}
            sub="generated for workers"
          />
          <StatCard
            label="Avg Income"
            value={`₱${(stats.avgProviderIncome ?? 0).toLocaleString()}`}
            icon={<Star className="h-4 w-4" />}
            sub="per provider"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Most In-Demand Skills</h2>
          {topSkills.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet.</p>
          ) : (
            <BarList items={topSkills as unknown as Record<string, unknown>[]} labelKey="skill" valueKey="count" />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Jobs by Service Category</h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet.</p>
          ) : (
            <BarList items={topCategories as unknown as Record<string, unknown>[]} labelKey="category" valueKey="count" />
          )}
        </div>
      </div>

      {/* Workforce summary table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Workforce Summary Report</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {[
              ["Total Registered Workers", stats.totalProviders],
              ["New Registrations (This Month)", stats.newProvidersThisMonth],
              ["Active Job Postings", stats.activeJobs],
              ["Jobs Completed (All Time)", stats.completedJobs],
              ["Total Income Generated", `₱${(stats.totalIncomeGenerated ?? 0).toLocaleString()}`],
              ["Avg Provider Income", `₱${(stats.avgProviderIncome ?? 0).toLocaleString()}`],
            ].map(([label, value]) => (
              <tr key={String(label)}>
                <td className="py-2.5 text-slate-600">{label}</td>
                <td className="py-2.5 text-slate-800 font-semibold text-right">{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
