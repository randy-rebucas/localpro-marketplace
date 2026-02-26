import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import type { IJob } from "@/types";

async function getClientStats(clientId: string) {
  await connectDB();

  const [activeJobs, escrowJobs, transactions, recentJobs] = await Promise.all([
    Job.countDocuments({
      clientId,
      status: { $in: ["open", "assigned", "in_progress"] },
    }),
    Job.find({ clientId, escrowStatus: "funded" }).select("budget"),
    Transaction.find({ payerId: clientId, status: "completed" }).select("amount"),
    Job.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const escrowLocked = escrowJobs.reduce((sum, j) => sum + j.budget, 0);
  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);

  return { activeJobs, escrowLocked, totalSpend, recentJobs };
}

export default async function ClientDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const { activeJobs, escrowLocked, totalSpend, recentJobs } =
    await getClientStats(currentUser.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <Link href="/client/post-job" className="btn-primary">
          + Post a Job
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Jobs"
          value={activeJobs}
          subtitle="Open, assigned & in-progress"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <KpiCard
          title="Escrow Locked"
          value={formatCurrency(escrowLocked)}
          subtitle="Held in escrow"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        <KpiCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          subtitle="All completed jobs"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Jobs</h3>
          <Link href="/client/jobs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <p className="text-sm">No jobs yet.</p>
            <Link href="/client/post-job" className="mt-3 inline-block btn-primary text-xs">
              Post your first job
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentJobs.map((job) => {
              const j = job as unknown as IJob;
              return (
                <li key={j._id.toString()} className="px-6 py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/client/jobs/${j._id}`}
                      className="text-sm font-medium text-slate-900 hover:text-primary truncate block"
                    >
                      {j.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {j.category} · {formatRelativeTime(j.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(j.budget)}
                    </span>
                    <JobStatusBadge status={j.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
