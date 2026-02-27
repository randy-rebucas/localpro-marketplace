import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { formatCurrency, formatDate } from "@/lib/utils";
import AdminJobActions from "./AdminJobActions";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import { MapPin, Calendar, User } from "lucide-react";
import type { IJob } from "@/types";

export const metadata: Metadata = { title: "Manage Jobs" };


function RiskBadge({ score }: { score: number }) {
  if (score > 60) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />High Risk · {score}
    </span>
  );
  if (score > 30) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Med Risk · {score}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Low Risk · {score}
    </span>
  );
}

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
            <div key={job._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              {/* Card header with risk color strip */}
              <div className={`h-1 w-full ${job.riskScore > 60 ? "bg-red-400" : job.riskScore > 30 ? "bg-amber-400" : "bg-green-400"}`} />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                          <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">{job.category}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{job.clientId.name}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Submitted {formatDate(job.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1.5">
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(job.budget)}</p>
                    <p className="text-xs text-slate-400">Scheduled {formatDate(job.scheduleDate)}</p>
                    <RiskBadge score={job.riskScore} />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm text-slate-700 line-clamp-3">
                  {job.description}
                </div>

                <AdminJobActions jobId={job._id.toString()} riskScore={job.riskScore} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
