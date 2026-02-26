import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import type { IJob } from "@/types";

async function getProviderStats(providerId: string) {
  await connectDB();

  const [activeJobs, transactions, reviews, recentJobs] = await Promise.all([
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
  ]);

  const totalEarnings = transactions.reduce((sum, t) => sum + t.netAmount, 0);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return { activeJobs, totalEarnings, avgRating, reviewCount: reviews.length, recentJobs };
}

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { activeJobs, totalEarnings, avgRating, reviewCount, recentJobs } =
    await getProviderStats(user.userId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-0.5">Your performance overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Earnings"
          value={formatCurrency(totalEarnings)}
          subtitle="After platform commission"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          title="Active Jobs"
          value={activeJobs}
          subtitle="Assigned & in-progress"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <KpiCard
          title="Avg Rating"
          value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—"}
          subtitle={`${reviewCount} review${reviewCount !== 1 ? "s" : ""}`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
          <Link href="/provider/jobs" className="text-sm text-primary hover:underline">View jobs</Link>
        </div>
        {recentJobs.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">
            No jobs yet. <Link href="/provider/marketplace" className="text-primary hover:underline">Browse the marketplace</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentJobs.map((job) => {
              const j = job as unknown as IJob;
              return (
                <li key={j._id.toString()} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{j.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{j.category} · {formatRelativeTime(j.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(j.budget)}</span>
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
