"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FileBarChart, Users, Briefcase, CircleDollarSign,
  Star, TrendingUp, Download, RefreshCw, Tag,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useTranslations } from "next-intl";

interface Stats {
  totalProviders: number;
  newProvidersThisMonth: number;
  activeJobs: number;
  completedJobs: number;
  totalIncomeGenerated: number;
  avgProviderIncome: number;
}

interface SkillEntry    { skill: string;    count: number }
interface CategoryEntry { category: string; count: number }

interface ReportData {
  stats: Stats;
  tagBreakdown: { tag: string; count: number }[];
  topSkills: SkillEntry[];
  topCategories: CategoryEntry[];
  officeName: string;
  municipality: string;
  region: string;
}

const TAG_LABELS: Record<string, string> = {
  peso:        "PESO Program",
  lgu_project: "LGU Project",
  gov_program: "Gov't Program",
  emergency:   "Emergency",
  internship:  "Internship",
};

const TAG_COLORS: Record<string, string> = {
  peso:        "bg-blue-50 text-blue-700 border-blue-200",
  lgu_project: "bg-emerald-50 text-emerald-700 border-emerald-200",
  gov_program: "bg-violet-50 text-violet-700 border-violet-200",
  emergency:   "bg-red-50 text-red-700 border-red-200",
  internship:  "bg-amber-50 text-amber-700 border-amber-200",
};

const STAT_ICON_CLS = "h-4 w-4";

function StatCard({
  label, value, icon, sub, accent = "blue",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  accent?: "blue" | "emerald" | "violet" | "amber";
}) {
  const accents: Record<string, string> = {
    blue:    "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet:  "bg-violet-50 text-violet-600",
    amber:   "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${accents[accent]}`}>{icon}</div>
      </div>
    </div>
  );
}

function BarList({
  items, valueKey, labelKey,
}: {
  items: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 w-36 shrink-0 truncate">{String(item[labelKey])}</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${(Number(item[valueKey]) / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 w-6 text-right tabular-nums">
            {Number(item[valueKey])}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SkeletonCard() {
  return <div className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />;
}

export default function ReportsPage() {
  const t = useTranslations("pesoPages");
  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    apiFetch("/api/peso/reports")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load reports");
        return r.json();
      })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Providers",         data.stats.totalProviders],
      ["New This Month",          data.stats.newProvidersThisMonth],
      ["Active Jobs",             data.stats.activeJobs],
      ["Completed Jobs",          data.stats.completedJobs],
      ["Total Earnings (PHP)",    data.stats.totalIncomeGenerated],
      ["Avg Provider Income (PHP)", data.stats.avgProviderIncome],
      [],
      ["Top Skills", "Count"],
      ...data.topSkills.map((s) => [s.skill, s.count]),
      [],
      ["Top Categories", "Count"],
      ...data.topCategories.map((c) => [c.category, c.count]),
    ];
    const csv  = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `peso-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-3.5 w-64 bg-slate-100 rounded" />
          </div>
          <div className="h-8 w-28 bg-slate-100 rounded-lg" />
        </div>
        <div>
          <div className="h-3.5 w-36 bg-slate-100 rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-52 bg-white rounded-xl border border-slate-200" />
          <div className="h-52 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, tagBreakdown, topSkills, topCategories, officeName, municipality, region } = data;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-blue-600" />
            {t("reports")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {officeName
              ? <><span className="font-medium text-slate-600">{officeName}</span> &mdash; {municipality}, {region}</>
              : t("reportsSub")}
          </p>
          <p className="text-xs text-blue-600 mt-1 font-medium">
            {t("scopedNote")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh data"
            className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportCsv")}
          </button>
        </div>
      </div>

      {/* Employment metrics */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("employmentMetrics")}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Providers"
            value={(stats.totalProviders ?? 0).toLocaleString()}
            icon={<Users className={STAT_ICON_CLS} />}
            accent="blue"
          />
          <StatCard
            label="New This Month"
            value={(stats.newProvidersThisMonth ?? 0).toLocaleString()}
            icon={<TrendingUp className={STAT_ICON_CLS} />}
            sub="provider registrations"
            accent="emerald"
          />
          <StatCard
            label="Active Jobs"
            value={(stats.activeJobs ?? 0).toLocaleString()}
            icon={<Briefcase className={STAT_ICON_CLS} />}
            sub="currently open"
            accent="blue"
          />
          <StatCard
            label="Completed Jobs"
            value={(stats.completedJobs ?? 0).toLocaleString()}
            icon={<Briefcase className={STAT_ICON_CLS} />}
            sub="all time"
            accent="violet"
          />
          <StatCard
            label="Total Earnings"
            value={`₱${(stats.totalIncomeGenerated ?? 0).toLocaleString()}`}
            icon={<CircleDollarSign className={STAT_ICON_CLS} />}
            sub="generated for workers"
            accent="emerald"
          />
          <StatCard
            label="Avg Income"
            value={`₱${(stats.avgProviderIncome ?? 0).toLocaleString()}`}
            icon={<Star className={STAT_ICON_CLS} />}
            sub="per provider"
            accent="amber"
          />
        </div>
      </div>

      {/* Bar charts */}
      {tagBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-slate-400" />
            Jobs by Programme Tag
          </h2>
          <div className="flex flex-wrap gap-2">
            {tagBreakdown.map(({ tag, count }) => (
              <div
                key={tag}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                  TAG_COLORS[tag] ?? "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <span>{TAG_LABELS[tag] ?? tag}</span>
                <span className="font-bold tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Most In-Demand Skills</h2>
          {topSkills.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No data yet.</p>
          ) : (
            <BarList
              items={topSkills as unknown as Record<string, unknown>[]}
              labelKey="skill"
              valueKey="count"
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Jobs by Service Category</h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No data yet.</p>
          ) : (
            <BarList
              items={topCategories as unknown as Record<string, unknown>[]}
              labelKey="category"
              valueKey="count"
            />
          )}
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Workforce Summary Report</h2>
          <span className="text-xs text-slate-400">
            as of {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {([
              ["Total Registered Workers",        stats.totalProviders,           "(includes all active providers)"],
              ["New Registrations (This Month)",  stats.newProvidersThisMonth,    ""],
              ["Active Job Postings",             stats.activeJobs,               "currently open to providers"],
              ["Jobs Completed (All Time)",       stats.completedJobs,            ""],
              ["Total Income Generated",          `₱${(stats.totalIncomeGenerated ?? 0).toLocaleString()}`, "paid to workers"],
              ["Avg Provider Income",             `₱${(stats.avgProviderIncome ?? 0).toLocaleString()}`,    "per worker"],
            ] as [string, string | number, string][]).map(([label, value, note]) => (
              <tr key={label} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3 text-slate-600">
                  {label}
                  {note && <span className="ml-1.5 text-xs text-slate-400">{note}</span>}
                </td>
                <td className="px-5 py-3 text-slate-800 font-semibold text-right tabular-nums">
                  {String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
