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
import { CircleDollarSign, BarChart3, Lock, AlertTriangle } from "lucide-react";
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
