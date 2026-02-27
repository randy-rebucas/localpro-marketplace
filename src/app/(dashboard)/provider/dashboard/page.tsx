import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import KpiCard from "@/components/ui/KpiCard";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { CircleDollarSign, Briefcase, Star } from "lucide-react";
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
