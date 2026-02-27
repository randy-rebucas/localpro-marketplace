import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { IJob } from "@/types";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";

async function getClientJobs(clientId: string) {
  await connectDB();
  return Job.find({ clientId })
    .sort({ createdAt: -1 })
    .populate("providerId", "name")
    .lean();
}

export default async function ClientJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobs = await getClientJobs(user.userId);

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="job" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Jobs</h2>
          <p className="text-slate-500 text-sm mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/client/post-job" className="btn-primary">+ Post a Job</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No jobs posted yet.</p>
          <Link href="/client/post-job" className="mt-3 inline-block btn-primary text-xs">
            Post your first job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const j = job as unknown as IJob & { providerId?: { name: string } };
            return (
              <Link
                key={j._id.toString()}
                href={`/client/jobs/${j._id}`}
                className="block bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover transition-shadow p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{j.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {j.category} · {j.location} · Posted {formatDate(j.createdAt)}
                    </p>
                    {j.providerId && (
                      <p className="text-xs text-slate-500 mt-1">
                        Provider: <span className="font-medium">{j.providerId.name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(j.budget)}</span>
                    <JobStatusBadge status={j.status} />
                    <EscrowBadge status={j.escrowStatus} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
