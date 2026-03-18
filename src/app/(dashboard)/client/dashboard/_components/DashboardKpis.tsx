import { jobRepository } from "@/repositories/job.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { userRepository } from "@/repositories/user.repository";
import KpiCard from "@/components/ui/KpiCard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, Lock, CircleDollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function DashboardKpis({ userId }: { userId: string }) {
  const [activeJobs, escrowLocked, totalSpend, userDoc, t] = await Promise.all([
    jobRepository.countActiveForClient(userId),
    transactionRepository.sumPendingByPayer(userId),
    transactionRepository.sumCompletedByPayer(userId),
    userRepository.findById(userId),
    getTranslations("clientPages"),
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
            {t("dash_welcomeBack")} <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">{t("dash_jobsToday")}</p>
        </div>
        <Link
          href="/client/post-job"
          className="btn-primary inline-flex items-center gap-1.5 flex-shrink-0 text-sm"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden xs:inline">{t("dash_postAJob")}</span>
          <span className="xs:hidden">{t("dash_post")}</span>
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          title={t("dash_kpiActiveJobs")}
          value={activeJobs}
          subtitle={t("dash_kpiActiveSubtitle")}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <KpiCard
          title={t("dash_kpiEscrow")}
          value={formatCurrency(escrowLocked)}
          subtitle={t("dash_kpiEscrowSubtitle")}
          icon={<Lock className="h-5 w-5" />}
        />
        <KpiCard
          title={t("dash_kpiTotalSpend")}
          value={formatCurrency(totalSpend)}
          subtitle={t("dash_kpiTotalSpendSubtitle")}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
      </div>
    </>
  );
}
