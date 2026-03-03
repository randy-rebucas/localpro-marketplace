import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { userRepository } from "@/repositories/user.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, Lock, CircleDollarSign } from "lucide-react";

export async function DashboardKpis({ userId }: { userId: string }) {
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
      {/* ── Header row ── */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{dateLabel}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Welcome back, <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">Here&apos;s what&apos;s happening with your jobs today.</p>
        </div>
        <Link
          href="/client/post-job"
          className="btn-primary inline-flex items-center gap-1.5 flex-shrink-0 text-sm"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden xs:inline">Post a Job</span>
          <span className="xs:hidden">Post</span>
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          title="Active Jobs"
          value={activeJobs}
          subtitle="Open, assigned & in-progress"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <KpiCard
          title="Escrow Locked"
          value={formatCurrency(escrowLocked)}
          subtitle="Funds held securely"
          icon={<Lock className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          subtitle="Across all completed jobs"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
      </div>
    </>
  );
}
