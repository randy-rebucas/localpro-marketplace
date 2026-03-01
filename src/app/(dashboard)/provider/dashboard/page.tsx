import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { userRepository } from "@/repositories/user.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import { getProviderTier } from "@/lib/tier";
import Link from "next/link";
import { CircleDollarSign, Briefcase, Star, Store, TrendingUp, Trophy, Flame, ShieldCheck, Zap, TriangleAlert } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Dashboard" };


async function getProviderStats(providerId: string) {
  const [activeJobs, earnings, ratingSummary, recentJobs, userDoc, profileDoc, streak] = await Promise.all([
    jobRepository.countActiveForProvider(providerId),
    transactionRepository.sumCompletedByPayee(providerId),
    reviewRepository.getProviderRatingSummary(providerId),
    jobRepository.findRecentForProvider(providerId, 5),
    userRepository.findById(providerId) as Promise<{ name?: string } | null>,
    providerProfileRepository.findByUserId(providerId) as Promise<{ completionRate?: number; completedJobCount?: number; avgResponseTimeHours?: number } | null>,
    reviewRepository.getFiveStarStreak(providerId),
  ]);

  const jobIds = recentJobs.map((j) => String(j._id));
  const fundedMap = jobIds.length > 0 ? await paymentRepository.findAmountsByJobIds(jobIds) : new Map<string, number>();
  const fundedAmounts: Record<string, number> = {};
  for (const [k, v] of fundedMap) fundedAmounts[k] = v;

  const firstName = userDoc?.name?.split(" ")[0] ?? "there";
  const completionRate = profileDoc?.completionRate ?? 100;
  const completedJobCount = profileDoc?.completedJobCount ?? 0;
  const avgResponseTimeHours = profileDoc?.avgResponseTimeHours ?? 0;

  return {
    activeJobs,
    totalEarnings: earnings.net,
    avgRating: ratingSummary.avgRating,
    reviewCount: ratingSummary.count,
    recentJobs,
    fundedAmounts,
    firstName,
    completionRate,
    completedJobCount,
    streak,
    avgResponseTimeHours,
  };
}



function ProviderDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded-lg" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>
      {/* Tier card */}
      <div className="h-20 bg-white rounded-xl border border-slate-200" />
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
      {/* Recent jobs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 h-14" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-50 h-16" />
        ))}
      </div>
    </div>
  );
}

async function ProviderDashboardContent({ userId }: { userId: string }) {
  const { activeJobs, totalEarnings, avgRating, reviewCount, recentJobs, fundedAmounts, firstName, completionRate, completedJobCount, streak, avgResponseTimeHours } =
    await getProviderStats(userId);

  const tier = getProviderTier(completedJobCount, avgRating, completionRate);
  const isTopPro = tier.hasAIAccess;

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}!</h2>
            {isTopPro && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Trophy className="h-3 w-3" /> {tier.label}
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
          <p className="text-slate-500 text-sm mt-0.5">Here&apos;s your performance overview.</p>
        </div>
        <Link href="/provider/marketplace" className="btn-primary">
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

      {/* Performance tier card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tier.emoji}</span>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Performance Tier</p>
              <p className="text-lg font-bold text-slate-900">{tier.label}</p>
            </div>
          </div>
          {tier.next && (
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-slate-500">Progress to <strong>{tier.next}</strong></span>
                <span className="text-xs font-semibold text-slate-700">{tier.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${tier.progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{tier.nextMsg}</p>
            </div>
          )}
          {!tier.next && (
            <div className="flex items-center gap-2 text-amber-700">
              <Flame className="h-4 w-4" />
              <span className="text-sm font-medium">You&apos;ve reached the top tier!</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Earnings"
          value={formatCurrency(totalEarnings)}
          subtitle="After platform commission"
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
        <KpiCard
          title="Active Jobs"
          value={activeJobs}
          subtitle="Assigned & in-progress"
          icon={<Briefcase className="h-6 w-6" />}
        />
        <KpiCard
          title="Avg Rating"
          value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—"}
          subtitle={`${reviewCount} review${reviewCount !== 1 ? "s" : ""}`}
          icon={<Star className="h-6 w-6" />}
        />
        <KpiCard
          title="Completion Rate"
          value={completedJobCount > 0 ? `${completionRate}%` : "—"}
          subtitle={`${completedJobCount} job${completedJobCount !== 1 ? "s" : ""} completed`}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <KpiCard
          title="Avg Response"
          value={avgResponseTimeHours > 0
            ? (avgResponseTimeHours < 1 ? `${Math.round(avgResponseTimeHours * 60)}m` : `${avgResponseTimeHours.toFixed(1)}h`)
            : "—"}
          subtitle={
            avgResponseTimeHours > 0
              ? (avgResponseTimeHours <= 2 ? `⚡ Fast Responder · ~${responseRatePct}% rate` : `~${responseRatePct}% response rate`)
              : "Time to first update"
          }
          icon={<Zap className="h-6 w-6" />}
        />
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
          <Link href="/provider/jobs" className="text-sm text-primary hover:underline">View jobs</Link>
        </div>
        {recentJobs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <p className="text-slate-600 text-sm font-medium">No jobs yet</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">Find your first job in the marketplace</p>
            <Link href="/provider/marketplace" className="btn-primary text-xs">Browse marketplace →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentJobs.map((job) => {
              const fundedGross = fundedAmounts[String(job._id)];
              const fundedNet = fundedGross !== undefined ? calculateCommission(fundedGross).netAmount : undefined;
              return (
              <li key={String(job._id)} className="px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mr-1.5">{job.category}</span>
                        {formatRelativeTime(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Budget</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(job.budget)}</p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                </div>
                {fundedGross !== undefined && fundedNet !== undefined && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      Funded: <span className="font-semibold text-slate-800">{formatCurrency(fundedGross)}</span>
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      · You receive: {formatCurrency(fundedNet)}
                    </span>
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="provider-dashboard"
        title="How your Provider Dashboard works"
        steps={[
          { icon: "📊", title: "Track performance", description: "See your active jobs, total earnings, average rating, and completion rate at a glance." },
          { icon: "🏆", title: "Earn your tier", description: "Complete jobs and earn 5-star reviews to rise through Rising → Expert → Top Pro tiers." },
          { icon: "🔥", title: "Keep your streak", description: "A 5-star streak shows consecutive top-rated jobs — it boosts client confidence in your profile." },
          { icon: "⚡", title: "Quick actions", description: "Jump to the Marketplace to find new jobs, or My Jobs to manage your active assignments." },
        ]}
      />
      <Suspense fallback={<ProviderDashboardSkeleton />}>
        <ProviderDashboardContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
