import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { userRepository } from "@/repositories/user.repository";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, Lock, CircleDollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

async function getClientStats(clientId: string) {
  const [activeJobs, escrowLocked, totalSpend, recentJobs, userDoc] = await Promise.all([
    jobRepository.countActiveForClient(clientId),
    jobRepository.sumFundedEscrowForClient(clientId),
    transactionRepository.sumCompletedByPayer(clientId),
    jobRepository.findRecentForClient(clientId, 5),
    userRepository.findById(clientId),
  ]);

  const firstName = (userDoc as { name?: string } | null)?.name?.split(" ")[0] ?? "there";

  return { activeJobs, escrowLocked, totalSpend, recentJobs, firstName };
}

export default async function ClientDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { activeJobs, escrowLocked, totalSpend, recentJobs, firstName } =
    await getClientStats(currentUser.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}!</h2>
          <p className="text-slate-500 text-sm mt-0.5">Here&apos;s what&apos;s happening with your jobs.</p>
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
          icon={<Briefcase className="h-6 w-6" />}
        />
        <KpiCard
          title="Escrow Locked"
          value={formatCurrency(escrowLocked)}
          subtitle="Held in escrow"
          icon={<Lock className="h-6 w-6" />}
        />
        <KpiCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          subtitle="All completed jobs"
          icon={<CircleDollarSign className="h-6 w-6" />}
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
            {recentJobs.map((job) => (
              <li key={String(job._id)} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/client/jobs/${String(job._id)}`}
                      className="text-sm font-medium text-slate-900 hover:text-primary truncate block"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mr-1.5">{job.category}</span>
                      {formatRelativeTime(job.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(job.budget)}
                  </span>
                  <JobStatusBadge status={job.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
