import { jobRepository } from "@/repositories/job.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, ShieldCheck } from "lucide-react";

export async function RecentJobs({ userId }: { userId: string }) {
  const recentJobs = await jobRepository.findRecentForClient(userId, 5);

  const jobIds = recentJobs.map((j) => String(j._id));
  const fundedMap =
    jobIds.length > 0
      ? await paymentRepository.findAmountsByJobIds(jobIds)
      : new Map<string, number>();

  return (
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
            const fundedAmount = fundedMap.get(String(job._id));
            return (
              <li key={String(job._id)} className="px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
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
                        <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mr-1.5">
                          {job.category}
                        </span>
                        {formatRelativeTime(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Budget</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(job.budget)}</p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                </div>
                {fundedAmount !== undefined && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      Funded:{" "}
                      <span className="font-semibold text-slate-800">{formatCurrency(fundedAmount)}</span>
                    </span>
                    {fundedAmount !== job.budget && (
                      <span className="text-xs text-slate-400 line-through ml-1">
                        {formatCurrency(job.budget)} budget
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
