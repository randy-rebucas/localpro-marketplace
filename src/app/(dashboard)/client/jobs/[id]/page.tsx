import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { disputeRepository } from "@/repositories/dispute.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { JobStatusBadge, EscrowBadge, QuoteStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import dynamic from "next/dynamic";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle, ShieldCheck, Star, CheckCircle2, Clock, Search, ChevronLeft } from "lucide-react";

// Client-side interactive components — deferred, no ssr:false needed
const JobActionButtons   = dynamic(() => import("./JobActionButtons"));
const QuoteAcceptButton  = dynamic(() => import("./QuoteAcceptButton"));
const RaiseDisputeButton = dynamic(() => import("@/components/shared/RaiseDisputeButton"));
const PartialReleaseButton = dynamic(() => import("@/components/payment/PartialReleaseButton"));
const StickyJobCTA = dynamic(() => import("./StickyJobCTA"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await getCurrentUser();
  if (!user) return { title: "Job Details" };
  const { id } = await params;
  const job = await jobRepository.findByClientAndId(user.userId, id);
  return { title: job ? `${job.title} — Job Details` : "Job Details" };
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 h-14" />
      <div className="px-6 py-4 space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Dispute section ──────────────────────────────────────────────────────────

async function DisputeSection({ jobId }: { jobId: string }) {
  const disputeDoc = await disputeRepository.findLatestByJobId(jobId);
  if (!disputeDoc) return null;

  const steps = [
    { label: "Submitted",    description: `Raised ${formatRelativeTime(disputeDoc.createdAt)}`,      icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Under Review", description: "An admin is investigating the issue",                     icon: <Search className="h-4 w-4" /> },
    { label: "Resolved",     description: disputeDoc.resolutionNotes ?? "Dispute has been resolved", icon: <ShieldCheck className="h-4 w-4" /> },
  ];
  const activeIdx = disputeDoc.status === "open" ? 0 : disputeDoc.status === "investigating" ? 1 : 2;

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-card p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        Dispute Status
      </h3>
      <div className="flex flex-col gap-0">
        {steps.map((s, i) => {
          const done    = i < activeIdx;
          const current = i === activeIdx;
          return (
            <div key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  done ? "bg-green-500 text-white" : current ? "bg-primary text-white" : "bg-slate-200 text-slate-400"
                }`}>
                  {s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${done ? "bg-green-400" : "bg-slate-200"}`} />
                )}
              </div>
              <div className="pb-5">
                <p className={`text-sm font-medium ${current ? "text-primary" : done ? "text-slate-900" : "text-slate-400"}`}>
                  {s.label}
                </p>
                {(done || current) && (
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                )}
                {current && disputeDoc.status === "open" && (
                  <p className="text-xs text-slate-500 mt-0.5">Your dispute is queued for admin review.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 mt-1 border-t border-slate-100 pt-3">
        Reason: <span className="text-slate-600">{disputeDoc.reason}</span>
      </p>
    </div>
  );
}

// ─── Quotes section ───────────────────────────────────────────────────────────

async function QuotesSection({ jobId, jobStatus }: { jobId: string; jobStatus: string }) {
  const quotes = await quoteRepository.findForJobWithProvider(jobId);

  const providerIds = quotes.map((q) => q.providerId._id.toString());
  const profiles = providerIds.length > 0
    ? await providerProfileRepository.findStatsByUserIds(providerIds)
    : [];
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  // Accepted quote summary (assigned / in_progress / completed / disputed)
  if (["assigned", "in_progress", "completed", "disputed"].includes(jobStatus)) {
    const accepted = quotes.find((q) => q.status === "accepted");
    if (!accepted) return null;
    const profile = profileMap.get(accepted.providerId._id.toString());
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Accepted Quote</h3>
        </div>
        <div className="px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex gap-3 flex-1">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {accepted.providerId.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900 text-sm">{accepted.providerId.name}</p>
                {accepted.providerId.isVerified && (
                  <span className="badge bg-blue-100 text-blue-700 text-xs">Verified</span>
                )}
              </div>
              {profile && (profile.avgRating ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {(profile.avgRating ?? 0).toFixed(1)} · {profile.completedJobCount} jobs
                </span>
              )}
              <p className="text-xs text-slate-500 mt-0.5">Timeline: {accepted.timeline}</p>
              <p className="text-sm text-slate-700 mt-2">{accepted.message}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <p className="text-lg font-bold text-slate-900">{formatCurrency(accepted.proposedAmount)}</p>
            <QuoteStatusBadge status={accepted.status} />
          </div>
        </div>
      </div>
    );
  }

  // All quotes (open jobs only)
  if (jobStatus !== "open") return null;

  return (
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
          {quotes.map((q) => {
            const providerInitials = q.providerId.name
              .split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const profile  = profileMap.get(q.providerId._id.toString());
            const avgRating = profile?.avgRating ?? 0;
            const jobsDone  = profile?.completedJobCount ?? 0;
            const isTopRated = avgRating >= 4.5 && jobsDone >= 3;

            return (
              <li key={q._id.toString()} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 flex-1">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{providerInitials}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900 text-sm">{q.providerId.name}</p>
                        {q.providerId.isVerified && (
                          <span className="badge bg-blue-100 text-blue-700 text-xs">Verified</span>
                        )}
                        {isTopRated && (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">⭐ Top Rated</span>
                        )}
                      </div>
                      {(avgRating > 0 || jobsDone > 0) && (
                        <div className="flex items-center gap-3 mt-0.5">
                          {avgRating > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {avgRating.toFixed(1)}
                            </span>
                          )}
                          {jobsDone > 0 && (
                            <span className="text-xs text-slate-400">{jobsDone} job{jobsDone !== 1 ? "s" : ""} completed</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">Timeline: {q.timeline}</p>
                      <p className="text-sm text-slate-700 mt-2">{q.message}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(q.proposedAmount)}</p>
                    <QuoteStatusBadge status={q.status} />
                    {q.status === "pending" && (
                      <QuoteAcceptButton
                        quoteId={q._id.toString()}
                        proposedAmount={q.proposedAmount}
                        providerName={q.providerId.name}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const paymentCancelled = sp.payment === "cancelled";

  const job = await jobRepository.findByClientAndId(user.userId, id);
  if (!job) notFound();

  // Fetch accepted quote amount for pre-filling the escrow amount
  let acceptedQuoteAmount: number | undefined;
  if (job.status === "assigned" && job.escrowStatus === "not_funded") {
    const quotes = await quoteRepository.findForJob(id);
    const accepted = (quotes as Array<{ status: string; proposedAmount: number }>).find(
      (q) => q.status === "accepted"
    );
    acceptedQuoteAmount = accepted?.proposedAmount;
  }

  // Fetch actual funded amount for the release payment modal
  let fundedAmount: number | undefined;
  if (job.escrowStatus === "funded") {
    const fundedMap = await paymentRepository.findAmountsByJobIds([id]);
    fundedAmount = fundedMap.get(id);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <RealtimeRefresher entity="job" id={id} />

      {/* Back navigation — streams immediately */}
      <Link
        href="/client/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to My Jobs
      </Link>

      {/* Payment cancelled banner */}
      {paymentCancelled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            Payment was cancelled. You can try funding escrow again when ready.
          </p>
        </div>
      )}

      {/* Header — available from core job fetch */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
        <p className="text-slate-400 text-sm mt-1">{job.category} · {job.location} · Posted {formatDate(job.createdAt)}</p>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap gap-3">
        <JobStatusBadge status={job.status} />
        <EscrowBadge status={job.escrowStatus} />
        {job.riskScore > 0 && (
          <span className={`badge ${job.riskScore > 60 ? "bg-red-100 text-red-700" : job.riskScore > 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
            Risk: {job.riskScore}
          </span>
        )}
      </div>

      {/* Job details card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-slate-800 whitespace-pre-wrap text-sm">{job.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Budget</p>
            <p className="font-semibold text-slate-900">{formatCurrency(job.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Schedule</p>
            <p className="font-semibold text-slate-900">{formatDate(job.scheduleDate)}</p>
          </div>
          {job.providerId && (
            <div>
              <p className="text-xs text-slate-500">Assigned Provider</p>
              <p className="font-semibold text-slate-900">{job.providerId.name}</p>
              <div className="mt-1">
                <ProviderInfoButton
                  providerId={String(job.providerId._id)}
                  providerName={job.providerId.name}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-4">
        <JobActionButtons jobId={job._id.toString()} status={job.status} escrowStatus={job.escrowStatus} budget={job.budget} acceptedAmount={acceptedQuoteAmount} fundedAmount={fundedAmount} />
        {job.status === "completed" && job.escrowStatus === "funded" && (
          <PartialReleaseButton jobId={job._id.toString()} budget={job.budget} />
        )}
        <RaiseDisputeButton jobId={job._id.toString()} status={job.status} />
      </div>

      {/* Dispute — deferred: independent DB query */}
      <Suspense fallback={null}>
        <DisputeSection jobId={id} />
      </Suspense>

      {/* Quotes — deferred: quotes + provider profile stats */}
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <QuotesSection jobId={id} jobStatus={job.status} />
      </Suspense>

      {/* Sticky CTA bar — primary action always visible at bottom */}
      <StickyJobCTA
        jobId={job._id.toString()}
        status={job.status}
        escrowStatus={job.escrowStatus}
        budget={job.budget}
        acceptedAmount={acceptedQuoteAmount}
        fundedAmount={fundedAmount}
      />
    </div>
  );
}
