import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { formatCurrency, formatDate } from "@/lib/utils";
import AdminJobActions from "./AdminJobActions";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import type { IJob } from "@/types";

export default async function AdminJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const jobs = await Job.find({ status: "pending_validation" })
    .sort({ createdAt: -1 })
    .populate("clientId", "name email")
    .lean() as unknown as (IJob & { clientId: { name: string; email: string } })[];

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="job" />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Job Validation</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""} pending review
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No jobs pending validation.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{job.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {job.category} · {job.location} · by {job.clientId.name} ({job.clientId.email})
                  </p>
                  <p className="text-xs text-slate-400">Submitted {formatDate(job.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(job.budget)}</p>
                  <p className="text-xs text-slate-400">Scheduled {formatDate(job.scheduleDate)}</p>
                  <p className={`text-xs font-medium mt-1 ${job.riskScore > 60 ? "text-red-500" : job.riskScore > 30 ? "text-amber-500" : "text-green-600"}`}>
                    Risk Score: {job.riskScore}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-700">{job.description}</p>
              </div>

              <AdminJobActions jobId={job._id.toString()} riskScore={job.riskScore} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
