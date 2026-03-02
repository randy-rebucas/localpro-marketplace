import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { userRepository } from "@/repositories/user.repository";
import { loyaltyRepository } from "@/repositories/loyalty.repository";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import LoyaltyBadge from "@/components/shared/LoyaltyBadge";
import MaintenanceReminder from "@/components/shared/MaintenanceReminder";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { getClientTier } from "@/lib/loyalty";
import Link from "next/link";
import { Briefcase, Lock, CircleDollarSign, ShieldCheck, Gift } from "lucide-react";
import { Suspense } from "react";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Skeletons ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-28" />
      ))}
    </div>
  );
}

function RecentJobsSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 h-14" />
      <div className="divide-y divide-slate-100">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 h-16" />
        ))}
      </div>
    </div>
  );
}

// ─── Async data sections ──────────────────────────────────────────────────────

async function DashboardKpis({ userId }: { userId: string }) {
  const [activeJobs, escrowLocked, totalSpend, userDoc] = await Promise.all([
    jobRepository.countActiveForClient(userId),
    transactionRepository.sumPendingByPayer(userId),
    transactionRepository.sumCompletedByPayer(userId),
    userRepository.findById(userId),
  ]);
  const firstName = (userDoc as { name?: string } | null)?.name?.split(" ")[0] ?? "there";

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{dateLabel}</p>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}!</h2>
          <p className="text-slate-500 text-sm mt-1">Here&apos;s what&apos;s happening with your jobs today.</p>
        </div>
        <Link href="/client/post-job" className="btn-primary flex-shrink-0 mt-1">
          + Post a Job
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Jobs"
          value={activeJobs}
          subtitle="Open, assigned & in-progress"
          icon={<Briefcase className="h-6 w-6" />}
        />
        <KpiCard
          title="Escrow Locked"
          value={formatCurrency(escrowLocked)}
          subtitle="Held in escrow"
          icon={<Lock className="h-6 w-6" />}
        />
        <KpiCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          subtitle="All completed jobs"
          icon={<CircleDollarSign className="h-6 w-6" />}
        />
      </div>
    </>
  );
}

async function RecentJobs({ userId }: { userId: string }) {
  const recentJobs = await jobRepository.findRecentForClient(userId, 5);

  const jobIds = recentJobs.map((j) => String(j._id));
  const fundedMap = jobIds.length > 0 ? await paymentRepository.findAmountsByJobIds(jobIds) : new Map<string, number>();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Recent Jobs</h3>
        <Link href="/client/jobs" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>
      {recentJobs.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-400">
          <p className="text-sm">No jobs yet.</p>
          <Link href="/client/post-job" className="mt-3 inline-block btn-primary text-xs">
            Post your first job
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {recentJobs.map((job) => {
            const fundedAmount = fundedMap.get(String(job._id));
            return (
            <li key={String(job._id)} className="px-6 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/client/jobs/${String(job._id)}`}
                      className="text-sm font-medium text-slate-900 hover:text-primary truncate block"
                    >
                      {job.title}
                    </Link>
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
              {fundedAmount !== undefined && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-slate-600">
                    Funded: <span className="font-semibold text-slate-800">{formatCurrency(fundedAmount)}</span>
                  </span>
                  {fundedAmount !== job.budget && (
                    <span className="text-xs text-slate-400 line-through ml-1">{formatCurrency(job.budget)} budget</span>
                  )}
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Loyalty Widget ───────────────────────────────────────────────────────────

async function LoyaltyWidget({ userId }: { userId: string }) {
  const account = await loyaltyRepository.findByUserId(userId);
  if (!account) return null;

  const tierInfo = getClientTier(account.lifetimePoints);

  return (
    <Link
      href="/client/rewards"
      className="flex items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/20 rounded-xl px-5 py-3.5 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
          <Gift className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              {account.points.toLocaleString()} pts
            </span>
            <LoyaltyBadge tier={account.tier} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5 max-w-[120px]">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${tierInfo.progress}%` }}
              />
            </div>
            {tierInfo.next && (
              <span className="text-xs text-slate-400">{tierInfo.pointsToNext} pts to {tierInfo.next}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {account.credits > 0 && (
          <p className="text-xs font-semibold text-green-600">{formatCurrency(account.credits)} credit</p>
        )}
        <p className="text-xs text-primary/70 group-hover:text-primary transition-colors">View Rewards →</p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="client-dashboard"
        title="How your Client Dashboard works"
        steps={[
          { icon: "📋", title: "Post a Job", description: "Click '+ Post a Job' to describe your service need, set a budget, and schedule a date." },
          { icon: "💬", title: "Review Quotes", description: "Providers will send you quotes. Open each job to compare quotes and accept the best one." },
          { icon: "🔒", title: "Fund Escrow", description: "After accepting a quote, fund escrow to secure your payment. Your money is held safely until the job is done." },
          { icon: "✅", title: "Release Payment", description: "Once the provider completes the job and you're satisfied, release payment from escrow." },
        ]}
      />
      {/* Greeting + KPIs stream in together */}
      <Suspense
        fallback={
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 animate-pulse">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-7 w-64 rounded bg-slate-100" />
                <div className="h-4 w-48 rounded bg-slate-100" />
              </div>
              <Link href="/client/post-job" className="btn-primary flex-shrink-0">
                + Post a Job
              </Link>
            </div>
            <KpiSkeleton />
          </>
        }
      >
        <DashboardKpis userId={currentUser.userId} />
      </Suspense>

      {/* Loyalty widget */}
      <Suspense fallback={<div className="h-14 rounded-xl bg-slate-50 border border-slate-200 animate-pulse" />}>
        <LoyaltyWidget userId={currentUser.userId} />
      </Suspense>

      {/* Maintenance reminders — self-hides if nothing due */}
      <MaintenanceReminder />

      {/* Recent jobs stream independently */}
      <Suspense fallback={<RecentJobsSkeleton />}>
        <RecentJobs userId={currentUser.userId} />
      </Suspense>
    </div>
  );
}
