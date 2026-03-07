import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import dynamic from "next/dynamic";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import BundleSuggestion from "@/components/shared/BundleSuggestion";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle, ChevronLeft, Copy } from "lucide-react";
import { StatusBanner }        from "./_components/StatusBanner";
import { JobDetailCard }       from "./_components/JobDetailCard";
import { JobProgressBar, JobServiceChecklist } from "./_components/JobTimeline";
import { DisputeSection }      from "./_components/DisputeSection";
import { QuotesSection }       from "./_components/QuotesSection";
import { SectionSkeleton }     from "./_components/skeletons";

// Client-side interactive components — deferred
const JobActionButtons     = dynamic(() => import("./_components/JobActionButtons"));
const RaiseDisputeButton   = dynamic(() => import("@/components/shared/RaiseDisputeButton"));
const PartialReleaseButton = dynamic(() => import("@/components/payment/PartialReleaseButton"));
const MilestonePanel       = dynamic(() => import("@/components/payment/MilestonePanel").then((m) => ({ default: m.MilestonePanel })));
const StickyJobCTA         = dynamic(() => import("./_components/StickyJobCTA"));
const JobPhotoGallery      = dynamic(() => import("@/components/shared/JobPhotoGallery"));

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

      {/* Back navigation */}
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

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 leading-snug">{job.title}</h1>
          <p className="text-slate-400 text-sm mt-1">
            Posted {formatDate(job.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 flex-shrink-0 pt-1">
          {/* Post Similar Job */}
          <Link
            href={`/client/post-job?${new URLSearchParams({
              title: job.title,
              category: job.category,
              description: job.description,
              budget: String(job.budget),
              location: job.location,
              ...(job.specialInstructions ? { specialInstructions: job.specialInstructions } : {}),
            }).toString()}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Post Similar
          </Link>
          <JobStatusBadge status={job.status} />
          <EscrowBadge status={job.escrowStatus} />
          {job.riskScore > 0 && (
            <span
              className={`badge ${
                job.riskScore > 60
                  ? "bg-red-100 text-red-700"
                  : job.riskScore > 30
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              Risk: {job.riskScore}
            </span>
          )}
        </div>
      </div>

      {/* Contextual status banner */}
      <StatusBanner status={job.status} escrowStatus={job.escrowStatus} />

      {/* Job details */}
      <JobDetailCard job={JSON.parse(JSON.stringify(job))} />

      {/* Progress bar — visible for active / completed jobs */}
      <JobProgressBar status={job.status} escrowStatus={job.escrowStatus} />

      {/* Service checklist */}
      <JobServiceChecklist status={job.status} escrowStatus={job.escrowStatus} />

      {/* Before & after photos */}
      {((job.beforePhoto && job.beforePhoto.length > 0) ||
        (job.afterPhoto && job.afterPhoto.length > 0)) && (
        <JobPhotoGallery
          beforePhoto={job.beforePhoto ?? []}
          afterPhoto={job.afterPhoto ?? []}
        />
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-4">
        <JobActionButtons
          jobId={job._id.toString()}
          status={job.status}
          escrowStatus={job.escrowStatus}
          budget={job.budget}
          acceptedAmount={acceptedQuoteAmount}
          fundedAmount={fundedAmount}
          category={job.category}
        />
        {job.status === "completed" && job.escrowStatus === "funded" && (
          <PartialReleaseButton jobId={job._id.toString()} budget={job.budget} />
        )}
        <RaiseDisputeButton jobId={job._id.toString()} status={job.status} />
      </div>

      {/* Milestone payments */}
      {job.escrowStatus === "funded" && (
        <MilestonePanel
          jobId={job._id.toString()}
          budget={fundedAmount ?? job.budget}
          jobStatus={job.status}
          escrowStatus={job.escrowStatus}
          isClient
          initialMilestones={(job.milestones ?? []).map((m) => ({
            ...m,
            _id: m._id?.toString?.() ?? m._id,
          }))}
        />
      )}

      {/* Dispute — deferred: independent DB query */}
      <Suspense fallback={null}>
        <DisputeSection jobId={id} />
      </Suspense>

      {/* Quotes — deferred: quotes + provider profile stats */}
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <QuotesSection jobId={id} jobStatus={job.status} />
      </Suspense>

      {/* Bundle suggestions */}
      {(["assigned", "in_progress", "completed"] as const).includes(
        job.status as never
      ) && <BundleSuggestion category={job.category} />}

      {/* Sticky CTA bar */}
      <StickyJobCTA
        jobId={job._id.toString()}
        status={job.status}
        escrowStatus={job.escrowStatus}
        budget={job.budget}
        acceptedAmount={acceptedQuoteAmount}
        fundedAmount={fundedAmount}
        category={job.category}
      />
    </div>
  );
}