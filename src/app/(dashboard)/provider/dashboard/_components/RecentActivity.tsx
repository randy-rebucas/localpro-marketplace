import { jobRepository } from "@/repositories/job.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import Link from "next/link";
import { Briefcase, ShieldCheck, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function RecentActivity({ userId }: { userId: string }) {
  const t = await getTranslations("providerPages");
  const recentJobs = await jobRepository.findRecentForProvider(userId, 5);

  const jobIds = recentJobs.map((j) => String(j._id));
  const fundedMap =
    jobIds.length > 0
      ? await paymentRepository.findAmountsByJobIds(jobIds)
      : new Map<string, number>();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{t("provDash_activityTitle")}</h3>
        <Link href="/provider/jobs" className="text-sm text-primary hover:underline">
          {t("provDash_activityViewAll")}
        </Link>
      </div>

      {recentJobs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <p className="text-slate-600 text-sm font-medium">{t("provDash_activityEmpty")}</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">{t("provDash_activityEmptySub")}</p>
          <Link href="/provider/marketplace" className="btn-primary text-xs">
            {t("provDash_activityBrowse")}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {recentJobs.map((job) => {
            const fundedGross = fundedMap.get(String(job._id));
            const fundedNet =
              fundedGross !== undefined
                ? calculateCommission(fundedGross).netAmount
                : undefined;
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
                        <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mr-1.5">
                          {job.category}
                        </span>
                        {formatRelativeTime(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-slate-400">{t("provDash_activityBudget")}</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(job.budget)}</p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                </div>
                {fundedGross !== undefined && fundedNet !== undefined && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600">
                      {t("provDash_activityFunded")}{" "}
                      <span className="font-semibold text-slate-800">{formatCurrency(fundedGross)}</span>
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      {t("provDash_activityYouReceive")} {formatCurrency(fundedNet)}
                    </span>
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
