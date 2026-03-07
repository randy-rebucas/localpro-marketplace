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

  const showPerfWarning =
    (avgRating > 0 && avgRating < 3.5) ||
    (completedJobCount > 0 && completionRate < 70);
  const perfWarningMsg =
    avgRating > 0 && avgRating < 3.5
      ? `Your rating is ${avgRating.toFixed(1)}★ — aim for 3.5★+ to avoid account restrictions.`
      : `Your completion rate is ${completionRate}% — maintain 70%+ to stay in good standing.`;

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
            <p className="text-sm font-medium text-amber-800">Performance needs attention</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {perfWarningMsg} Focus on delivering quality work and communicating proactively with clients.
            </p>
          </div>
        </div>
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
