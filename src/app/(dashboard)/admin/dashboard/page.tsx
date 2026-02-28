import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { disputeRepository } from "@/repositories/dispute.repository";
import { userRepository } from "@/repositories/user.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import AdminJobsChart from "./AdminJobsChart";
import Link from "next/link";
import { CircleDollarSign, BarChart3, Lock, AlertTriangle, ClipboardCheck, Users, ShieldAlert } from "lucide-react";
import type { JobStatus } from "@/types";

export const metadata: Metadata = { title: "Admin Dashboard" };


async function getAdminStats() {
  const [jobStatusCounts, txnTotals, escrowBalance, openDisputes, totalUsers] = await Promise.all([
    jobRepository.countByStatus(),
    transactionRepository.getAdminTotals(),
    jobRepository.sumFundedEscrowBalance(),
    disputeRepository.countOpen(),
    userRepository.count({}),
  ]);

  const jobsByStatus = Object.fromEntries(
    jobStatusCounts.map((s) => [s._id, s.count])
  ) as Record<JobStatus, number>;

  const { gmv: totalGMV, commission: totalCommission } = txnTotals;
  const activeJobs =
    (jobsByStatus.open ?? 0) + (jobsByStatus.assigned ?? 0) + (jobsByStatus.in_progress ?? 0);
  const pendingJobs = jobsByStatus.pending_validation ?? 0;

  return {
    totalGMV, totalCommission, escrowBalance, activeJobs,
    openDisputes, totalUsers, jobsByStatus, pendingJobs,
  };
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const stats = await getAdminStats();

  const chartData = Object.entries(stats.jobsByStatus).map(([status, count]) => ({
    status: status.replace("_", " "),
    count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="text-slate-500 text-sm mt-0.5">Platform overview and key metrics.</p>
      </div>

      {/* Attention banners */}
      {(stats.pendingJobs > 0 || stats.openDisputes > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.pendingJobs > 0 && (
            <Link href="/admin/jobs" className="group bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">{stats.pendingJobs} job{stats.pendingJobs !== 1 ? "s" : ""} awaiting review</p>
                  <p className="text-amber-600 text-xs mt-0.5">Approve or reject submissions</p>
                </div>
              </div>
              <span className="text-amber-600 text-sm font-medium group-hover:underline">Review →</span>
            </Link>
          )}
          {stats.openDisputes > 0 && (
            <Link href="/admin/disputes" className="group bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between hover:bg-red-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-200 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="font-semibold text-red-800 text-sm">{stats.openDisputes} active dispute{stats.openDisputes !== 1 ? "s" : ""}</p>
                  <p className="text-red-600 text-xs mt-0.5">Pending resolution</p>
                </div>
              </div>
              <span className="text-red-600 text-sm font-medium group-hover:underline">Resolve →</span>
            </Link>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total GMV" value={formatCurrency(stats.totalGMV)} subtitle="Gross marketplace volume"
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
        <KpiCard title="Commission" value={formatCurrency(stats.totalCommission)} subtitle="Platform revenue"
          icon={<BarChart3 className="h-6 w-6" />}
        />
        <KpiCard title="Escrow Balance" value={formatCurrency(stats.escrowBalance)} subtitle="Currently locked"
          icon={<Lock className="h-6 w-6" />}
        />
        <KpiCard title="Open Disputes" value={stats.openDisputes} subtitle={`${stats.activeJobs} active jobs`}
          icon={<AlertTriangle className="h-6 w-6" />}
        />
      </div>

      {/* Chart + quick stats side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Jobs by Status</h3>
          <AdminJobsChart data={chartData} />
        </div>
        <div className="space-y-4">
          <Link href="/admin/users" className="block bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:border-primary/30 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                <p className="text-xs text-slate-500">Total users</p>
              </div>
            </div>
          </Link>
          <Link href="/admin/jobs" className="block bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:border-primary/30 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.activeJobs}</p>
                <p className="text-xs text-slate-500">Active jobs</p>
              </div>
            </div>
          </Link>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.jobsByStatus.completed ?? 0}</p>
                <p className="text-xs text-slate-500">Completed jobs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
