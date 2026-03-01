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
import { ArrowLeft, ClipboardList, ShieldAlert, Gavel } from "lucide-react";
import type { IJob, IQuote } from "@/types";

const validationSteps = [
  {
    num: 1,
    icon: <ClipboardList className="h-4 w-4" />,
    label: "Review Info",
    desc: "Verify job details, budget, location, and schedule.",
  },
  {
    num: 2,
    icon: <ShieldAlert className="h-4 w-4" />,
    label: "Risk Assessment",
    desc: "Inspect AI risk score and adjust if needed.",
  },
  {
    num: 3,
    icon: <Gavel className="h-4 w-4" />,
    label: "Decision",
    desc: "Approve to publish or reject with a reason.",
  },
];

export const metadata: Metadata = { title: "Job Details" };


export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

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

      {/* Status row */}
      <div className="flex flex-wrap gap-3 items-center">
        <JobStatusBadge status={j.status} />
        <EscrowBadge status={j.escrowStatus} />
        <AdminEscrowOverride jobId={j._id.toString()} escrowStatus={j.escrowStatus} />
      </div>

      {/* ── Validation Steps ── */}
      {j.status === "pending_validation" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Validation Checklist
          </p>
          <ol className="flex flex-col sm:flex-row gap-3">
            {validationSteps.map((step, idx) => (
              <li key={step.num} className="flex-1 relative">
                {/* connector line */}
                {idx < validationSteps.length - 1 && (
                  <span className="hidden sm:block absolute top-5 left-full w-full h-px bg-slate-200 z-0 -translate-x-1/2" />
                )}
                <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100 relative z-10">
                  <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      {step.icon}
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── STEP 1: Review Job Info ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          {j.status === "pending_validation" && (
            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">1</span>
          )}
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job Information</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Client */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {j.clientId.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">{j.clientId.name}</p>
              <p className="text-xs text-slate-500">{j.clientId.email}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 rounded-lg p-3">
              {j.description}
            </p>
          </div>

          {/* Key fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-500">Budget</p>
              <p className="font-semibold text-slate-900 mt-0.5">{formatCurrency(j.budget)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="font-semibold text-slate-900 mt-0.5">{j.category}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Location</p>
              <p className="font-semibold text-slate-900 mt-0.5">{j.location}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Scheduled</p>
              <p className="font-semibold text-slate-900 mt-0.5">{formatDate(j.scheduleDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 2: Risk Assessment ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          {j.status === "pending_validation" && (
            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
          )}
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Risk Assessment</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            {/* Gauge */}
            <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 flex-shrink-0 ${
              j.riskScore > 60
                ? "border-red-400 bg-red-50 text-red-700"
                : j.riskScore > 30
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-green-400 bg-green-50 text-green-700"
            }`}>
              <span className="text-lg font-bold leading-none">{j.riskScore}</span>
              <span className="text-[9px] font-medium">/ 100</span>
            </div>
            <div>
              <p className={`text-sm font-semibold ${
                j.riskScore > 60 ? "text-red-700" : j.riskScore > 30 ? "text-amber-700" : "text-green-700"
              }`}>
                {j.riskScore > 60 ? "High Risk" : j.riskScore > 30 ? "Moderate Risk" : "Low Risk"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {j.riskScore > 60
                  ? "This job requires careful review. Consider rejecting or requesting more information."
                  : j.riskScore > 30
                  ? "Some elements may need verification before approving."
                  : "This job looks clean. You can approve with confidence."}
              </p>
            </div>
          </div>
          {/* Risk scale bar */}
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gradient-to-r from-green-400 via-amber-400 to-red-400 relative">
              <span
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-700 shadow"
                style={{ left: `${j.riskScore}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0 — Safe</span>
              <span>50</span>
              <span>100 — High Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3: Admin Decision ── */}
      {j.status === "pending_validation" && (
        <div className="bg-white rounded-xl border-2 border-primary/30 shadow-card overflow-hidden">
          <div className="px-6 py-3 border-b border-primary/20 bg-primary/5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">3</span>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Admin Decision</p>
          </div>
          <div className="p-6">
            <AdminJobActions jobId={j._id.toString()} riskScore={j.riskScore} />
          </div>
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
