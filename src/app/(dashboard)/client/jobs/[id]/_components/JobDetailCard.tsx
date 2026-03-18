import { Banknote, CalendarDays, User2, MapPin, Tag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";
import type { IJob } from "@/types";
import { getTranslations } from "next-intl/server";

type JobWithProvider = IJob & {
  providerId?: { _id: unknown; name: string; isVerified: boolean; avatar?: string };
};

interface Props {
  job: JobWithProvider;
}

function MetaChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs text-slate-400">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export async function JobDetailCard({ job }: Props) {
  const t = await getTranslations("clientPages");
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-5">
      {/* Description */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          {t("jobCard_description")}
        </p>
        <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">
          {job.description}
        </p>
      </div>

      {/* Divider */}
      <hr className="border-slate-100" />

      {/* Meta grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetaChip
          icon={<Banknote className="h-3 w-3" />}
          label={t("jobCard_budget")}
          value={formatCurrency(job.budget)}
        />
        <MetaChip
          icon={<CalendarDays className="h-3 w-3" />}
          label={t("jobCard_scheduled")}
          value={formatDate(job.scheduleDate)}
        />
        <MetaChip
          icon={<Tag className="h-3 w-3" />}
          label={t("jobCard_category")}
          value={job.category}
        />
        {job.location && (
          <MetaChip
            icon={<MapPin className="h-3 w-3" />}
            label={t("jobCard_location")}
            value={job.location}
          />
        )}
      </div>

      {/* Assigned provider row */}
      {job.providerId && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">{t("jobCard_assignedProvider")}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900">{job.providerId.name}</p>
              {job.providerId.isVerified && (
                <span className="badge bg-blue-100 text-blue-700 text-xs">{t("jobCard_verified")}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <ProviderInfoButton
              providerId={String(job.providerId._id)}
              providerName={job.providerId.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
