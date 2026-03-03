import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { userRepository } from "@/repositories/user.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  CircleDollarSign, Briefcase, Star, TrendingUp, Zap,
  Trophy, CalendarDays, TriangleAlert,
} from "lucide-react";

export async function DashboardKpis({ userId }: { userId: string }) {
  const [activeJobs, earnings, ratingSummary, streak, userDoc, profileDoc] =
    await Promise.all([
      jobRepository.countActiveForProvider(userId),
      transactionRepository.sumCompletedByPayee(userId),
      reviewRepository.getProviderRatingSummary(userId),
      reviewRepository.getFiveStarStreak(userId),
      userRepository.findById(userId) as Promise<{ name?: string } | null>,
      providerProfileRepository.findByUserId(userId) as Promise<{
        completionRate?: number;
        completedJobCount?: number;
        avgResponseTimeHours?: number;
      } | null>,
    ]);

  const firstName = userDoc?.name?.split(" ")[0] ?? "there";
  const { avgRating, count: reviewCount } = ratingSummary;
  const completionRate = profileDoc?.completionRate ?? 100;
  const completedJobCount = profileDoc?.completedJobCount ?? 0;
  const avgResponseTimeHours = profileDoc?.avgResponseTimeHours ?? 0;

  const isTopPro = completedJobCount >= 50 && avgRating >= 4.5 && completionRate >= 90;

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

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, <span className="text-primary">{firstName}</span>!
            </h1>
            {isTopPro && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Trophy className="h-3 w-3" /> Top Pro
              </span>
            )}
            {streak >= 3 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                🔥 {streak}-Star Streak
              </span>
            )}
            {avgResponseTimeHours > 0 && avgResponseTimeHours <= 2 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                <Zap className="h-3 w-3" /> Fast Responder
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Here&apos;s your performance overview.</p>
        </div>
        <Link href="/provider/marketplace" className="btn-primary flex-shrink-0">
          Browse Jobs
        </Link>
      </div>

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

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Earnings"
          value={formatCurrency(earnings.net)}
          subtitle="After platform commission"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
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
