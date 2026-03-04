import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { jobRepository } from "@/repositories";
import User from "@/models/User";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, User as UserIcon, Briefcase, Flag, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import PageGuide from "@/components/shared/PageGuide";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";

export const metadata: Metadata = { title: "Fraud Monitor" };

// ─── Risk badge helper ────────────────────────────────────────────────────────

function RiskBadge({ score }: { score: number }) {
  if (score >= 70)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Critical · {score}
      </span>
    );
  if (score >= 50)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        High · {score}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Med · {score}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlaggedJob {
  _id: { toString(): string };
  title: string;
  category: string;
  budget: number;
  status: string;
  riskScore: number;
  fraudFlags: string[];
  clientId: { _id: { toString(): string }; name: string; email: string };
  createdAt: Date;
}

interface SuspiciousUser {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  kycStatus?: string;
  isVerified?: boolean;
  isSuspended?: boolean;
  flaggedJobCount?: number;
  fraudFlags?: string[];
  createdAt: Date;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminFraudPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  await connectDB();

  const [flaggedJobs, suspiciousUsers] = await Promise.all([
    jobRepository.findFlaggedJobs({ riskThreshold: 50, limit: 100 }) as Promise<FlaggedJob[]>,
    User.find({
      $or: [
        { fraudFlags: { $exists: true, $not: { $size: 0 } } },
        { flaggedJobCount: { $gte: 2 } },
      ],
      isDeleted: { $ne: true },
    })
      .select("name email role kycStatus isVerified isSuspended flaggedJobCount fraudFlags createdAt")
      .sort({ flaggedJobCount: -1, createdAt: -1 })
      .limit(100)
      .lean() as Promise<SuspiciousUser[]>,
  ]);

  const criticalJobs = flaggedJobs.filter((j) => j.riskScore >= 70);
  const highRiskJobs = flaggedJobs.filter((j) => j.riskScore >= 50 && j.riskScore < 70);

  return (
    <div className="space-y-8">
      <PageGuide
        pageKey="admin-fraud"
        title="How Fraud Monitoring works"
        steps={[
          { icon: "🔍", title: "Automatic scanning", description: "Every job submission is scanned for spam keywords, off-platform payment requests, phishing language, and suspicious patterns." },
          { icon: "📊", title: "Risk scoring", description: "Jobs receive a 0–100 composite risk score combining content signals, budget, category, schedule urgency, and client behaviour." },
          { icon: "🚨", title: "Flagged items", description: "Jobs with a score ≥ 50 or explicit fraud flags are surfaced here for admin review before they reach providers." },
          { icon: "👤", title: "User risk profiles", description: "Clients who repeatedly trigger fraud signals accumulate a flagged-job count and are shown here for account review." },
        ]}
      />

      <RealtimeRefresher entity="job" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<ShieldAlert className="h-5 w-5 text-red-500" />}  label="Critical Jobs"     value={criticalJobs.length}    color="red" />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} label="High-Risk Jobs" value={highRiskJobs.length}    color="orange" />
        <StatCard icon={<Flag className="h-5 w-5 text-amber-500" />}       label="Total Flagged Jobs" value={flaggedJobs.length}     color="amber" />
        <StatCard icon={<UserIcon className="h-5 w-5 text-rose-500" />}    label="Suspicious Users"   value={suspiciousUsers.length} color="rose" />
      </div>

      {/* Flagged Jobs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Flagged Jobs
            <span className="ml-2 text-sm font-normal text-slate-400">({flaggedJobs.length})</span>
          </h2>
        </div>

        {flaggedJobs.length === 0 ? (
          <EmptyState message="No flagged jobs at this time." />
        ) : (
          <div className="space-y-3">
            {flaggedJobs.map((job) => (
              <div
                key={String(job._id)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div
                  className={`h-1 w-full ${
                    job.riskScore >= 70 ? "bg-red-500" : "bg-orange-400"
                  }`}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/jobs/${String(job._id)}`}
                        className="font-semibold text-slate-900 hover:text-primary transition-colors text-sm"
                      >
                        {job.title}
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                        <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                          {job.category}
                        </span>
                        <span>
                          Client:{" "}
                          <Link
                            href={`/admin/users/${String(job.clientId._id)}`}
                            className="text-primary hover:underline"
                          >
                            {job.clientId.name}
                          </Link>
                        </span>
                        <span>{formatDate(job.createdAt)}</span>
                        <span className="capitalize">{job.status.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1.5">
                      <p className="text-base font-bold text-slate-900">{formatCurrency(job.budget)}</p>
                      <RiskBadge score={job.riskScore} />
                    </div>
                  </div>

                  {/* Fraud flags */}
                  {(job.fraudFlags?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(job.fraudFlags ?? []).map((flag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5"
                        >
                          <Flag className="h-2.5 w-2.5" />
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Link
                      href={`/admin/jobs/${String(job._id)}`}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      Review job <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Suspicious Users */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Suspicious Users
            <span className="ml-2 text-sm font-normal text-slate-400">({suspiciousUsers.length})</span>
          </h2>
        </div>

        {suspiciousUsers.length === 0 ? (
          <EmptyState message="No suspicious users detected." />
        ) : (
          <div className="space-y-3">
            {suspiciousUsers.map((u) => (
              <div
                key={String(u._id)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/users/${String(u._id)}`}
                      className="font-semibold text-slate-900 hover:text-primary transition-colors text-sm"
                    >
                      {u.name}
                    </Link>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                      <span>{u.email}</span>
                      <span className="capitalize">{u.role}</span>
                      <span>KYC: {u.kycStatus ?? "none"}</span>
                      <span>Joined {formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-1">
                      <Flag className="h-3 w-3" />
                      {u.flaggedJobCount ?? 0} flagged job{(u.flaggedJobCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {u.isSuspended && (
                      <span className="block text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
                        Suspended
                      </span>
                    )}
                  </div>
                </div>

                {/* Behaviour flags */}
                {(u.fraudFlags?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {u.fraudFlags!.map((flag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5"
                      >
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/admin/users/${String(u._id)}`}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    View profile <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "red" | "orange" | "amber" | "rose";
}) {
  const colorMap = {
    red:    "bg-red-50 border-red-100",
    orange: "bg-orange-50 border-orange-100",
    amber:  "bg-amber-50 border-amber-100",
    rose:   "bg-rose-50 border-rose-100",
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
      {message}
    </div>
  );
}
