import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Quote from "@/models/Quote";
import { JobStatusBadge, EscrowBadge, QuoteStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import JobActionButtons from "./JobActionButtons";
import QuoteAcceptButton from "./QuoteAcceptButton";
import RaiseDisputeButton from "@/components/shared/RaiseDisputeButton";
import { notFound } from "next/navigation";
import type { IJob, IQuote } from "@/types";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  await connectDB();

  const job = await Job.findOne({ _id: id, clientId: user.userId })
    .populate("clientId", "name email")
    .populate("providerId", "name email")
    .lean();

  if (!job) notFound();

  const j = job as unknown as IJob & {
    providerId?: { _id: string; name: string; email: string };
    clientId: { name: string; email: string };
  };

  const quotes = await Quote.find({ jobId: id })
    .populate("providerId", "name email isVerified")
    .sort({ createdAt: -1 })
    .lean() as unknown as (IQuote & {
      providerId: { _id: string; name: string; email: string; isVerified: boolean };
    })[];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{j.title}</h2>
        <p className="text-slate-400 text-sm mt-1">{j.category} · {j.location} · Posted {formatDate(j.createdAt)}</p>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap gap-3">
        <JobStatusBadge status={j.status} />
        <EscrowBadge status={j.escrowStatus} />
        {j.riskScore > 0 && (
          <span className={`badge ${j.riskScore > 60 ? "bg-red-100 text-red-700" : j.riskScore > 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
            Risk: {j.riskScore}
          </span>
        )}
      </div>

      {/* Job details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-slate-800 whitespace-pre-wrap text-sm">{j.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Budget</p>
            <p className="font-semibold text-slate-900">{formatCurrency(j.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Schedule</p>
            <p className="font-semibold text-slate-900">{formatDate(j.scheduleDate)}</p>
          </div>
          {j.providerId && (
            <div>
              <p className="text-xs text-slate-500">Assigned Provider</p>
              <p className="font-semibold text-slate-900">{j.providerId.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons (client-side component for interactivity) */}
      <div className="flex flex-wrap items-center gap-4">
        <JobActionButtons jobId={j._id.toString()} status={j.status} escrowStatus={j.escrowStatus} />
        <RaiseDisputeButton jobId={j._id.toString()} status={j.status} />
      </div>

      {/* Quotes */}
      {j.status === "open" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Quotes ({quotes.length})</h3>
          </div>
          {quotes.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">
              No quotes yet. Providers will submit quotes once the job is approved.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <li key={q._id.toString()} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 text-sm">{q.providerId.name}</p>
                        {q.providerId.isVerified && (
                          <span className="badge bg-blue-100 text-blue-700 text-xs">Verified</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Timeline: {q.timeline}</p>
                      <p className="text-sm text-slate-700 mt-2">{q.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(q.proposedAmount)}</p>
                      <QuoteStatusBadge status={q.status} />
                      {q.status === "pending" && (
                        <QuoteAcceptButton quoteId={q._id.toString()} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
