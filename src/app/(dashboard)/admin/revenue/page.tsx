import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { transactionRepository } from "@/repositories/transaction.repository";
import { ledgerRepository } from "@/repositories/ledger.repository";
import { userRepository } from "@/repositories/user.repository";
import { jobRepository } from "@/repositories/job.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import { CircleDollarSign, TrendingUp, Users, Briefcase } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";

// Lazy-load Recharts bundle (~300 KB) — code-split so it's not in the initial JS bundle
const RevenueLineChart = dynamic(
  () => import("./RevenueCharts").then((m) => m.RevenueLineChart),
  { loading: () => <div className="h-60 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl" /> }
);
const JobsBarChart = dynamic(
  () => import("./RevenueCharts").then((m) => m.JobsBarChart),
  { loading: () => <div className="h-60 animate-pulse bg-slate-100 dark:bg-slate-700 rounded-xl" /> }
);

export const metadata: Metadata = { title: "Revenue Dashboard" };

async function getRevenueStats() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Ledger is the authoritative source for GMV and commission figures.
  // Jobs count, user count, and top-payee names still come from their own collections
  // since the ledger doesn't store those dimensions.
  const [ledgerTotals, ledgerMonthly, jobMonthlyAgg, topPayeesAgg, totalUsers, completedJobs] =
    await Promise.all([
      ledgerRepository.getRevenueTotals(),
      ledgerRepository.getMonthlyLedgerRevenue(oneYearAgo),
      transactionRepository.getMonthlyRevenue(oneYearAgo),
      transactionRepository.getTopPayees(5),
      userRepository.count({}),
      jobRepository.count({ status: "completed" }),
    ]);

  // Convert centavos → PHP
  const totalGMV        = ledgerTotals.gmvCentavos        / 100;
  const totalCommission = ledgerTotals.commissionCentavos / 100;

  // Build ordered 12-month labels (some months may have no data)
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const ledgerRow = ledgerMonthly.find(
      (r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
    );
    const jobRow = jobMonthlyAgg.find(
      (r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
    );
    return {
      month:      label,
      gmv:        (ledgerRow?.gmv        ?? 0) / 100,
      commission: (ledgerRow?.commission ?? 0) / 100,
      jobs:       jobRow?.jobs ?? 0,
    };
  });

  const providerIds = topPayeesAgg.map((r) => String(r._id));
  const topUsers = await userRepository.findAll({ _id: { $in: providerIds } });

  const earningsMap = new Map(topPayeesAgg.map((r) => [String(r._id), r.earned]));
  const topProviderRows = topUsers.map((u) => ({
    name:   (u as unknown as { name: string }).name,
    email:  (u as unknown as { email: string }).email,
    earned: earningsMap.get(String(u._id)) ?? 0,
  })).sort((a, b) => b.earned - a.earned);

  return { totalGMV, totalCommission, totalUsers, completedJobs, months, topProviderRows };
}

export default async function AdminRevenuePage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const { totalGMV, totalCommission, totalUsers, completedJobs, months, topProviderRows } =
    await getRevenueStats();

  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const commissionPct = totalGMV > 0 ? ((totalCommission / totalGMV) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Revenue Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Platform financials and growth metrics.</p>
        </div>
      </div>

      <PageGuide
        pageKey="admin-revenue"
        title="How the Revenue Dashboard works"
        steps={[
          { icon: "💰", title: "GMV & commission", description: "Gross Merchandise Value is total job amounts processed. Commission is the 15% platform fee collected." },
          { icon: "📈", title: "Monthly trends", description: "The line chart shows GMV and commission growth month-over-month to track platform health." },
          { icon: "🏆", title: "Top providers", description: "See which providers are generating the most revenue on the platform." },
          { icon: "📊", title: "Job volume", description: "The bar chart shows completed job counts per month — a leading indicator of marketplace activity." },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total GMV"
          value={formatCurrency(totalGMV)}
          subtitle="All-time gross"
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
        <KpiCard
          title="Total Commission"
          value={formatCurrency(totalCommission)}
          subtitle={`${commissionPct}% avg take rate`}
          icon={<TrendingUp className="h-6 w-6" />}
          className="border-green-200"
        />
        <KpiCard
          title="Completed Jobs"
          value={completedJobs.toLocaleString()}
          subtitle="All-time"
          icon={<Briefcase className="h-6 w-6" />}
        />
        <KpiCard
          title="Total Users"
          value={totalUsers.toLocaleString()}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      {/* Revenue over time */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Revenue Over Time</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Last 12 months — GMV and commission</p>
          </div>
          <div className="flex gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span>
              This month:{" "}
              <strong className="text-slate-800 dark:text-white">{formatCurrency(thisMonth.gmv)}</strong>
            </span>
            <span>
              Last month:{" "}
              <strong className="text-slate-800 dark:text-white">{formatCurrency(lastMonth.gmv)}</strong>
            </span>
          </div>
        </div>
        <RevenueLineChart data={months} />
      </div>

      {/* Jobs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Completed Jobs per Month</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Last 12 months</p>
        <JobsBarChart data={months} />
      </div>

      {/* Top earners */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Top Earning Providers</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50">
              <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Provider</th>
              <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Net Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {topProviderRows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No data yet.
                </td>
              </tr>
            ) : (
              topProviderRows.map((p, i) => (
                <tr key={p.email} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4">#{i + 1}</span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(p.earned)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
