import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { userRepository } from "@/repositories/user.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { CircleDollarSign, Briefcase, Star, Store, TrendingUp, Trophy, Flame } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };


async function getProviderStats(providerId: string) {
  const [activeJobs, earnings, ratingSummary, recentJobs, userDoc, profileDoc] = await Promise.all([
    jobRepository.countActiveForProvider(providerId),
    transactionRepository.sumCompletedByPayee(providerId),
    reviewRepository.getProviderRatingSummary(providerId),
    jobRepository.findRecentForProvider(providerId, 5),
    userRepository.findById(providerId) as Promise<{ name?: string } | null>,
    providerProfileRepository.findByUserId(providerId) as Promise<{ completionRate?: number; completedJobCount?: number } | null>,
  ]);

  const firstName = userDoc?.name?.split(" ")[0] ?? "there";
  const completionRate = profileDoc?.completionRate ?? 100;
  const completedJobCount = profileDoc?.completedJobCount ?? 0;

  return {
    activeJobs,
    totalEarnings: earnings.net,
    avgRating: ratingSummary.avgRating,
    reviewCount: ratingSummary.count,
    recentJobs,
    firstName,
    completionRate,
    completedJobCount,
  };
}

function getPerformanceTier(jobs: number, rating: number, rate: number) {
  if (jobs >= 25 && rating >= 4.5 && rate >= 90)
    return { label: "Top Pro", emoji: "🏆", color: "amber",   next: null,          nextMsg: "",                                 progress: 100 };
  if (jobs >= 10 && rating >= 4.0 && rate >= 85)
    return { label: "Expert",  emoji: "💼", color: "blue",    next: "Top Pro",      nextMsg: "Complete 25 jobs, 4.5★, 90% rate",  progress: Math.min(99, Math.round((jobs / 25) * 100)) };
  if (jobs >= 3)
    return { label: "Rising Star", emoji: "⭐", color: "green", next: "Expert",   nextMsg: "Complete 10 jobs, 4.0★, 85% rate",  progress: Math.min(99, Math.round((jobs / 10) * 100)) };
  return   { label: "Newcomer", emoji: "🌱", color: "slate",   next: "Rising Star", nextMsg: "Complete your first 3 jobs",         progress: Math.min(99, Math.round((jobs / 3) * 100)) };
}

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { activeJobs, totalEarnings, avgRating, reviewCount, recentJobs, firstName, completionRate, completedJobCount } =
    await getProviderStats(user.userId);

  const tier = getPerformanceTier(completedJobCount, avgRating, completionRate);
  const isTopPro = tier.label === "Top Pro";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}!</h2>
            {isTopPro && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Trophy className="h-3 w-3" /> Top Pro
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Here&apos;s your performance overview.</p>
        </div>
        <Link href="/provider/marketplace" className="btn-primary">
          Browse Jobs
        </Link>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            {recentJobs.map((job) => (
              <li key={String(job._id)} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
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
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(job.budget)}</span>
                  <JobStatusBadge status={job.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
