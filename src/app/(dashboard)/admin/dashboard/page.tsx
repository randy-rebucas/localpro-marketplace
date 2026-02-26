import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import Dispute from "@/models/Dispute";
import User from "@/models/User";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import AdminJobsChart from "./AdminJobsChart";
import Link from "next/link";
import type { JobStatus } from "@/types";

async function getAdminStats() {
  await connectDB();

  const [jobStatusCounts, completedTxns, escrowJobs, openDisputes, totalUsers] =
    await Promise.all([
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Transaction.find({ status: "completed" }).select("amount commission"),
      Job.find({ escrowStatus: "funded" }).select("budget"),
      Dispute.countDocuments({ status: { $in: ["open", "investigating"] } }),
      User.countDocuments(),
    ]);

  const jobsByStatus = Object.fromEntries(
    jobStatusCounts.map((s: { _id: string; count: number }) => [s._id, s.count])
  ) as Record<JobStatus, number>;

  const totalGMV = completedTxns.reduce((s, t) => s + t.amount, 0);
  const totalCommission = completedTxns.reduce((s, t) => s + t.commission, 0);
  const escrowBalance = escrowJobs.reduce((s, j) => s + j.budget, 0);
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

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total GMV" value={formatCurrency(stats.totalGMV)} subtitle="Gross marketplace volume"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard title="Commission" value={formatCurrency(stats.totalCommission)} subtitle="Platform revenue"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <KpiCard title="Escrow Balance" value={formatCurrency(stats.escrowBalance)} subtitle="Currently locked"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
        />
        <KpiCard title="Open Disputes" value={stats.openDisputes} subtitle={`${stats.activeJobs} active jobs`}
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Quick actions */}
      {stats.pendingJobs > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {stats.pendingJobs} job{stats.pendingJobs !== 1 ? "s" : ""} pending validation
            </p>
            <p className="text-amber-600 text-xs mt-0.5">Review and approve or reject these jobs</p>
          </div>
          <Link href="/admin/jobs" className="btn-primary text-xs py-2 px-4 bg-amber-600 hover:bg-amber-700">
            Review Now →
          </Link>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Jobs by Status</h3>
        <AdminJobsChart data={chartData} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <p className="text-xs text-slate-500">Total Users</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <p className="text-xs text-slate-500">Active Jobs</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeJobs}</p>
        </div>
      </div>
    </div>
  );
}
