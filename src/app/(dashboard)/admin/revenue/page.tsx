import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { transactionRepository } from "@/repositories/transaction.repository";
import { userRepository } from "@/repositories/user.repository";
import { jobRepository } from "@/repositories/job.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import { CircleDollarSign, TrendingUp, Users, Briefcase } from "lucide-react";

// Lazy-load Recharts bundle (~300 KB) — code-split so it's not in the initial JS bundle
const RevenueLineChart = dynamic(
  () => import("./RevenueCharts").then((m) => m.RevenueLineChart),
  { loading: () => <div className="h-60 animate-pulse bg-slate-100 rounded-lg" /> }
);
const JobsBarChart = dynamic(
  () => import("./RevenueCharts").then((m) => m.JobsBarChart),
  { loading: () => <div className="h-60 animate-pulse bg-slate-100 rounded-lg" /> }
);

export const metadata: Metadata = { title: "Revenue Dashboard" };

async function getRevenueStats() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const [totals, monthlyAgg, topPayeesAgg, totalUsers, completedJobs] = await Promise.all([
    transactionRepository.getAdminTotals(),
    transactionRepository.getMonthlyRevenue(oneYearAgo),
    transactionRepository.getTopPayees(5),
    userRepository.count({}),
    jobRepository.count({ status: "completed" }),
  ]);

  const { gmv: totalGMV, commission: totalCommission } = totals;

  // Build ordered 12-month labels (some months may have no data)
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const row   = monthlyAgg.find(
      (r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
    );
    return { month: label, gmv: row?.gmv ?? 0, commission: row?.commission ?? 0, jobs: row?.jobs ?? 0 };
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
  if (!user) return null;

  const { totalGMV, totalCommission, totalUsers, completedJobs, months, topProviderRows } =
    await getRevenueStats();

  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const commissionPct = totalGMV > 0 ? ((totalCommission / totalGMV) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Revenue Dashboard</h2>
        <p className="text-slate-500 text-sm mt-0.5">Platform financials and growth metrics.</p>
      </div>

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Revenue Over Time</h3>
            <p className="text-xs text-slate-400">Last 12 months — GMV and commission</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>
              This month:{" "}
              <strong className="text-slate-800">{formatCurrency(thisMonth.gmv)}</strong>
            </span>
            <span>
              Last month:{" "}
              <strong className="text-slate-800">{formatCurrency(lastMonth.gmv)}</strong>
            </span>
          </div>
        </div>
        <RevenueLineChart data={months} />
      </div>

      {/* Jobs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Completed Jobs per Month</h3>
        <p className="text-xs text-slate-400 mb-4">Last 12 months</p>
        <JobsBarChart data={months} />
      </div>

      {/* Top earners */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Top Earning Providers</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Provider</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Net Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topProviderRows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center text-slate-400 text-sm">
                  No data yet.
                </td>
              </tr>
            ) : (
              topProviderRows.map((p, i) => (
                <tr key={p.email} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600">
                    {formatCurrency(p.earned)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
