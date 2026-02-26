import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import ProviderJobActions from "./ProviderJobActions";
import RaiseDisputeButton from "@/components/shared/RaiseDisputeButton";
import type { IJob } from "@/types";

export default async function ProviderJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const jobs = await Job.find({
    providerId: user.userId,
    status: { $in: ["assigned", "in_progress", "completed"] },
  })
    .populate("clientId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Active Jobs</h2>
        <p className="text-slate-500 text-sm mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No active jobs. <a href="/provider/marketplace" className="text-primary hover:underline">Browse the marketplace.</a>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const j = job as unknown as IJob & { clientId: { name: string } };
            return (
              <div key={j._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{j.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {j.category} · Client: {j.clientId.name} · Scheduled {formatDate(j.scheduleDate)}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{j.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(j.budget)}</p>
                    <JobStatusBadge status={j.status} />
                    <EscrowBadge status={j.escrowStatus} />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4">
                  <ProviderJobActions jobId={j._id.toString()} status={j.status} escrowStatus={j.escrowStatus} />
                  <RaiseDisputeButton jobId={j._id.toString()} status={j.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
