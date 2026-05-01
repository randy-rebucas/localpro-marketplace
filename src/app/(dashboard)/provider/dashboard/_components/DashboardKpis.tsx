import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import {
  CircleDollarSign, Briefcase, Star, TrendingUp, Zap,
  ShieldCheck, FileText,
} from "lucide-react";
import { DisciplinaryNotice } from "@/components/shared/DisciplinaryNotice";
import {
  DISCIPLINARY_SUPPORT_EMAIL,
  PROVIDER_PERFORMANCE_POLICY_LINKS,
  buildProviderPerformanceEvidenceLines,
} from "@/lib/disciplinary-notice";

export async function DashboardKpis({ userId }: { userId: string }) {
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

  const ratingTrigger = avgRating > 0 && avgRating < 3.5;
  const completionTrigger = completedJobCount > 0 && completionRate < 70;
  const showPerfWarning = ratingTrigger || completionTrigger;

  const responseRatePct =
    avgResponseTimeHours <= 0 ? 0
    : avgResponseTimeHours < 1 ? 99
    : avgResponseTimeHours < 4 ? 95
    : avgResponseTimeHours < 24 ? 85
    : 70;

  return (
    <>
      {/* Performance warning — structured notice (metrics as evidence; policies + appeal paths) */}
      {showPerfWarning && (
        <DisciplinaryNotice
          tone="amber"
          title="Performance needs attention"
          reasonHeading="Why you are seeing this"
          reasonBody="Measured marketplace metrics on your account are below the thresholds we highlight on the dashboard. This is an advisory notice so you can improve before any escalation. Persistent or severe issues may be reviewed under the agreements linked below."
          evidenceLines={
            ratingTrigger && completionTrigger
              ? [
                  ...buildProviderPerformanceEvidenceLines({
                    avgRating,
                    reviewCount,
                    completionRate,
                    completedJobCount,
                    trigger: "rating",
                  }),
                  ...buildProviderPerformanceEvidenceLines({
                    avgRating,
                    reviewCount,
                    completionRate,
                    completedJobCount,
                    trigger: "completion",
                  }),
                ]
              : buildProviderPerformanceEvidenceLines({
                  avgRating,
                  reviewCount,
                  completionRate,
                  completedJobCount,
                  trigger: ratingTrigger ? "rating" : "completion",
                })
          }
          policyLinks={PROVIDER_PERFORMANCE_POLICY_LINKS}
          appealHeading="Appeal, correction, or questions"
          appealLines={[
            "Visit the Help Center at /support and include specific job IDs if you believe completion or ratings are incorrect.",
            `Email ${DISCIPLINARY_SUPPORT_EMAIL} from your registered address with \"Performance metrics review\" in the subject line.`,
            "Improving ratings and completion rate through delivery and communication is the usual path back to strong standing; formal account actions, when they occur, follow the cited agreement sections.",
          ]}
        />
      )}

      {/* KPI cards — row 1: financials */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="This Month"
          value={formatCurrency(monthlyNet)}
          subtitle="Net earnings (current month)"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Earnings"
          value={formatCurrency(earnings.net)}
          subtitle="All-time net after commission"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Escrow Pending"
          value={formatCurrency(escrowPending)}
          subtitle="Funded, awaiting release"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending Quotes"
          value={pendingQuotes}
          subtitle={pendingQuotes === 1 ? "Awaiting client decision" : "Awaiting client decisions"}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* KPI cards — row 2: performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Jobs"
          value={activeJobs}
          subtitle="Assigned & in-progress"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <KpiCard
          title="Avg Rating"
          value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—"}
          subtitle={`${reviewCount} review${reviewCount !== 1 ? "s" : ""}`}
          icon={<Star className="h-5 w-5" />}
        />
        <KpiCard
          title="Completion Rate"
          value={completedJobCount > 0 ? `${completionRate}%` : "—"}
          subtitle={`${completedJobCount} job${completedJobCount !== 1 ? "s" : ""} completed`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Avg Response"
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
                ? `⚡ Fast Responder · ~${responseRatePct}% rate`
                : `~${responseRatePct}% response rate`
              : "Time to first update"
          }
          icon={<Zap className="h-5 w-5" />}
        />
      </div>
    </>
  );
}
