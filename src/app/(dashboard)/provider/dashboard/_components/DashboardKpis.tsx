import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import {
  CircleDollarSign, Briefcase, Star, TrendingUp, Zap,
  TriangleAlert, ShieldCheck, FileText,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function DashboardKpis({ userId }: { userId: string }) {
  const t = await getTranslations("providerPages");
  const [activeJobs, earnings, ratingSummary, profileDoc, pendingQuotes, escrowPending, monthlyNet] =
    await Promise.all([
      jobRepository.countActiveForProvider(userId),
      transactionRepository.sumCompletedByPayee(userId),
      reviewRepository.getProviderRatingSummary(userId),
      providerProfileRepository.findByUserId(userId) as Promise<{
        completionRate?: number;
        completedJobCount?: number;
        avgResponseTimeHours?: number;
      } | null>,
      quoteRepository.countPendingByProvider(userId),
      transactionRepository.sumPendingByPayee(userId),
      transactionRepository.sumCurrentMonthByPayee(userId),
    ]);

  const { avgRating, count: reviewCount } = ratingSummary;
  const completionRate = profileDoc?.completionRate ?? 100;
  const completedJobCount = profileDoc?.completedJobCount ?? 0;
  const avgResponseTimeHours = profileDoc?.avgResponseTimeHours ?? 0;

  const showPerfWarning =
    (avgRating > 0 && avgRating < 3.5) ||
    (completedJobCount > 0 && completionRate < 70);
  const perfWarningMsg =
    avgRating > 0 && avgRating < 3.5
      ? t("provDash_perfWarningRating", { rating: avgRating.toFixed(1) })
      : t("provDash_perfWarningCompletion", { rate: completionRate });

  const responseRatePct =
    avgResponseTimeHours <= 0 ? 0
    : avgResponseTimeHours < 1 ? 99
    : avgResponseTimeHours < 4 ? 95
    : avgResponseTimeHours < 24 ? 85
    : 70;

  return (
    <>
      {/* Performance warning */}
      {showPerfWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <TriangleAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">{t("provDash_perfWarningTitle")}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {perfWarningMsg} {t("provDash_perfWarningFocus")}
            </p>
          </div>
        </div>
      )}

      {/* KPI cards — row 1: financials */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t("provDash_kpiThisMonth")}
          value={formatCurrency(monthlyNet)}
          subtitle={t("provDash_kpiThisMonthSub")}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title={t("provDash_kpiTotalEarnings")}
          value={formatCurrency(earnings.net)}
          subtitle={t("provDash_kpiTotalEarningsSub")}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title={t("provDash_kpiEscrow")}
          value={formatCurrency(escrowPending)}
          subtitle={t("provDash_kpiEscrowSub")}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <KpiCard
          title={t("provDash_kpiPendingQuotes")}
          value={pendingQuotes}
          subtitle={pendingQuotes === 1 ? t("provDash_kpiPendingQuotesSub") : t("provDash_kpiPendingQuotesSubPlural")}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* KPI cards — row 2: performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t("provDash_kpiActiveJobs")}
          value={activeJobs}
          subtitle={t("provDash_kpiActiveJobsSub")}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <KpiCard
          title={t("provDash_kpiAvgRating")}
          value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—"}
          subtitle={reviewCount !== 1 ? t("provDash_kpiReviewCountPlural", { n: reviewCount }) : t("provDash_kpiReviewCount", { n: reviewCount })}
          icon={<Star className="h-5 w-5" />}
        />
        <KpiCard
          title={t("provDash_kpiCompletionRate")}
          value={completedJobCount > 0 ? `${completionRate}%` : "—"}
          subtitle={completedJobCount !== 1 ? t("provDash_kpiJobCompletedPlural", { n: completedJobCount }) : t("provDash_kpiJobCompleted", { n: completedJobCount })}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title={t("provDash_kpiAvgResponse")}
          value={
            avgResponseTimeHours > 0
              ? avgResponseTimeHours < 1
                ? `${Math.round(avgResponseTimeHours * 60)}m`
                : `${avgResponseTimeHours.toFixed(1)}h`
              : "—"
          }
          subtitle={
            avgResponseTimeHours > 0
              ? avgResponseTimeHours <= 2
                ? t("provDash_kpiResponseFast", { pct: responseRatePct })
                : t("provDash_kpiResponseRate", { pct: responseRatePct })
              : t("provDash_kpiResponseTime")
          }
          icon={<Zap className="h-5 w-5" />}
        />
      </div>
    </>
  );
}
