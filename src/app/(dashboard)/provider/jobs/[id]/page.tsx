import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import dynamic from "next/dynamic";
import Link from "next/link";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import { DisputeSection } from "./_components/DisputeSection";
import {
  ChevronLeft,
  Briefcase,
  MapPin,
  CalendarDays,
  User2,
  Banknote,
  FileText,
  ShieldCheck,
  AlertCircle,
  Clock,
  Info,
  Camera,
} from "lucide-react";

const ProviderJobActions = dynamic(() => import("../ProviderJobActions"));
const RaiseDisputeButton = dynamic(() => import("@/components/shared/RaiseDisputeButton"));
const JobPhotoGallery = dynamic(() => import("@/components/shared/JobPhotoGallery"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const user = await getCurrentUser();
    if (!user) return { title: "Job Details" };
    const { id } = await params;
    const job = await jobRepository.findByProviderAndId(user.userId, id);
    return { title: job ? `${job.title} — Job Details` : "Job Details" };
  } catch {
    return { title: "Job Details" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProviderJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const t = await getTranslations("providerPages");
  const { id } = await params;
  const job = await jobRepository.findByProviderAndId(user.userId, id);
  if (!job) notFound();

  // Normalize photo arrays
  const beforePhoto = Array.isArray(job.beforePhoto) ? job.beforePhoto : job.beforePhoto ? [job.beforePhoto as unknown as string] : [];
  const afterPhoto  = Array.isArray(job.afterPhoto)  ? job.afterPhoto  : job.afterPhoto  ? [job.afterPhoto  as unknown as string] : [];

  // Payment / escrow amounts
  const paymentAmounts = await paymentRepository.findAmountsByJobIds([id]);
  const fundedGross = paymentAmounts.get(id);
  const commission  = fundedGross !== undefined ? calculateCommission(fundedGross) : null;

  const escrowNotFunded =
    job.status !== "completed" &&
    job.status !== "disputed" &&
    job.escrowStatus !== "funded";

  const metaGrid = [
    { icon: <Briefcase className="h-4 w-4" />,    label: t("metaCategory"), value: job.category },
    { icon: <MapPin className="h-4 w-4" />,        label: t("metaLocation"),  value: job.location },
    { icon: <Banknote className="h-4 w-4" />,      label: t("metaBudget"),    value: formatCurrency(job.budget) },
    { icon: <CalendarDays className="h-4 w-4" />,  label: t("metaScheduled"), value: formatDate(job.scheduleDate) },
    { icon: <User2 className="h-4 w-4" />,         label: t("metaClient"),    value: job.clientId?.name ?? "\u2014" },
    { icon: <Clock className="h-4 w-4" />,         label: t("metaPosted"),    value: formatDate(job.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="job" />

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/provider/jobs"
          className="flex-shrink-0 mt-0.5 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("backToJobs")}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Job overview card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            {escrowNotFunded && (
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">{t("awaitingEscrow")}</p>
              </div>
            )}
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <JobStatusBadge status={job.status} />
                    <EscrowBadge status={job.escrowStatus} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(job.budget)}</p>
              </div>

              {/* Meta grid */}
              <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
                {metaGrid.map(({ icon, label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">
                      {icon} {label}
                    </dt>
                    <dd className="text-sm font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              {t("sectionDescription")}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>

            {job.specialInstructions && (
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">{t("specialInstructions")}</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{job.specialInstructions}</p>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          {(beforePhoto.length > 0 || afterPhoto.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-400" />
                {t("sectionPhotos")}
              </h3>
              <JobPhotoGallery beforePhoto={beforePhoto} afterPhoto={afterPhoto} />
            </div>
          )}
        </div>

        {/* ── Sidebar column ── */}
        <div className="space-y-5">

          {/* Escrow / payment card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              {t("sectionPayment")}
            </h3>

            {commission ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t("escrowFunded")}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(commission.gross)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Platform fee ({Math.round(commission.rate * 100)}%)</span>
                  <span className="text-slate-500">−{formatCurrency(commission.commission)}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-2.5">
                  <span className="font-semibold text-slate-900">{t("youReceive")}</span>
                  <span className="font-bold text-emerald-600 text-base">{formatCurrency(commission.netAmount)}</span>
                </div>
                {job.partialReleaseAmount != null && (
                  <p className="text-xs text-slate-400 pt-1">
                    Partial release of {formatCurrency(job.partialReleaseAmount)} applied.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <ShieldCheck className="h-6 w-6 text-slate-200" />
                <p className="text-sm text-slate-400">{t("escrowNotFunded")}</p>
                <p className="text-xs text-slate-400">{t("escrowNotFundedDesc")}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-3">
            <h3 className="font-semibold text-slate-900">{t("sectionActions")}</h3>
            <ProviderJobActions
              jobId={id}
              status={job.status}
              escrowStatus={job.escrowStatus}
              beforePhoto={beforePhoto}
              afterPhoto={afterPhoto}
            />
            <RaiseDisputeButton jobId={id} status={job.status} />
          </div>

          {/* Dispute status */}
          {job.status === "disputed" && (
            <Suspense>
              <DisputeSection jobId={id} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
