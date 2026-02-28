import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import AdminJobActions from "../AdminJobActions";
import AdminEscrowOverride from "@/components/shared/AdminEscrowOverride";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { IJob, IQuote } from "@/types";

export const metadata: Metadata = { title: "Job Details" };


export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;

  const [jobRaw, quotes] = await Promise.all([
    jobRepository.findByIdPopulated(id),
    quoteRepository.findForJob(id),
  ]);

  if (!jobRaw) notFound();

  const j = jobRaw as unknown as IJob & {
    clientId: { name: string; email: string };
    providerId?: { name: string; email: string };
  };

  const typedQuotes = quotes as unknown as (IQuote & {
    providerId: { name: string; email: string };
  })[];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to validation queue
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{j.title}</h2>
        <p className="text-slate-400 text-sm mt-1">
          {j.category} · {j.location} · Submitted {formatDate(j.createdAt)}
        </p>
      </div>

      {/* Status, risk & escrow override */}
      <div className="flex flex-wrap gap-3 items-center">
        <JobStatusBadge status={j.status} />
        <EscrowBadge status={j.escrowStatus} />
        <span className={`badge ${j.riskScore > 60 ? "bg-red-100 text-red-700" : j.riskScore > 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          Risk Score: {j.riskScore}
        </span>
        <AdminEscrowOverride jobId={j._id.toString()} escrowStatus={j.escrowStatus} />
      </div>

      {/* Client info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Client</p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {j.clientId.name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{j.clientId.name}</p>
            <p className="text-xs text-slate-500">{j.clientId.email}</p>
          </div>
        </div>
      </div>

      {/* Job details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">{j.description}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">Budget</p>
            <p className="font-semibold text-slate-900 mt-0.5">{formatCurrency(j.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Scheduled</p>
            <p className="font-semibold text-slate-900 mt-0.5">{formatDate(j.scheduleDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Location</p>
            <p className="font-semibold text-slate-900 mt-0.5">{j.location}</p>
          </div>
        </div>
      </div>

      {/* Admin actions — only for pending validation */}
      {j.status === "pending_validation" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <p className="text-sm font-medium text-slate-700 mb-4">Admin Decision</p>
          <AdminJobActions jobId={j._id.toString()} riskScore={j.riskScore} />
        </div>
      )}

      {/* Quotes received */}
      {typedQuotes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Quotes Received ({typedQuotes.length})</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {typedQuotes.map((q) => (
              <li key={q._id.toString()} className="px-6 py-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{q.providerId.name}</p>
                    <p className="text-xs text-slate-500">{q.providerId.email}</p>
                    <p className="text-sm text-slate-600 mt-2">{q.message}</p>
                    <p className="text-xs text-slate-400 mt-1">Timeline: {q.timeline}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">{formatCurrency(q.proposedAmount)}</p>
                    <span className={`badge mt-1 ${q.status === "accepted" ? "bg-green-100 text-green-700" : q.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {q.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
