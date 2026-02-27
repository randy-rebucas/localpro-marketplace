import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import User from "@/models/User";
import ProviderProfile from "@/models/ProviderProfile";
// ↑ User is used inside getProviderStats — connectDB() is called only once there
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { CircleDollarSign, Briefcase, Star, Store, TrendingUp } from "lucide-react";
import type { IJob } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };


async function getProviderStats(providerId: string) {
  await connectDB();

  const [activeJobs, transactions, reviews, recentJobs, userDoc, profileDoc] = await Promise.all([
    Job.countDocuments({
      providerId,
      status: { $in: ["assigned", "in_progress"] },
    }),
    Transaction.find({ payeeId: providerId, status: "completed" }).select("netAmount"),
    Review.find({ providerId }).select("rating"),
    Job.find({ providerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    User.findById(providerId).select("name").lean() as Promise<{ name?: string } | null>,
    ProviderProfile.findOne({ userId: providerId }).select("completionRate completedJobCount").lean() as Promise<{ completionRate?: number; completedJobCount?: number } | null>,
  ]);

  const totalEarnings = transactions.reduce((sum, t) => sum + t.netAmount, 0);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const firstName = userDoc?.name?.split(" ")[0] ?? "there";
  const completionRate = profileDoc?.completionRate ?? 100;
  const completedJobCount = profileDoc?.completedJobCount ?? 0;

  return { activeJobs, totalEarnings, avgRating, reviewCount: reviews.length, recentJobs, firstName, completionRate, completedJobCount };
}

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { activeJobs, totalEarnings, avgRating, reviewCount, recentJobs, firstName, completionRate, completedJobCount } =
    await getProviderStats(user.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}!</h2>
          <p className="text-slate-500 text-sm mt-0.5">Here&apos;s your performance overview.</p>
        </div>
        <Link href="/provider/marketplace" className="btn-primary">
          Browse Jobs
        </Link>
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
            {recentJobs.map((job) => {
              const j = job as unknown as IJob;
              return (
                <li key={j._id.toString()} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{j.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mr-1.5">{j.category}</span>
                        {formatRelativeTime(j.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-800">{formatCurrency(j.budget)}</span>
                    <JobStatusBadge status={j.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
