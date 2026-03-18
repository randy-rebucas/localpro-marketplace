import Image from "next/image";
import Link from "next/link";
import { Star, Clock, MessageSquare } from "lucide-react";
import { quoteRepository } from "@/repositories/quote.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { QuoteStatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";
import QuoteAcceptButton from "./QuoteAcceptButton";
import { getTranslations } from "next-intl/server";

/* ─── Shared provider avatar ─────────────────────────────────── */
function ProviderAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-slate-200">
      {avatar ? (
        <Image src={avatar} alt={name} width={40} height={40} className="h-10 w-10 object-cover" />
      ) : (
        <div className="h-full w-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{initials}</span>
        </div>
      )}
    </div>
  );
}

/* ─── QuotesSection ──────────────────────────────────────────── */
export async function QuotesSection({
  jobId,
  jobStatus,
}: {
  jobId: string;
  jobStatus: string;
}) {
  const [quotes, t] = await Promise.all([
    quoteRepository.findForJobWithProvider(jobId),
    getTranslations("clientPages"),
  ]);

  const providerIds = quotes.map((q) => q.providerId._id.toString());
  const profiles =
    providerIds.length > 0
      ? await providerProfileRepository.findStatsByUserIds(providerIds)
      : [];
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  /* ── Accepted quote view (assigned / in_progress / completed / disputed) ── */
  if (["assigned", "in_progress", "completed", "disputed"].includes(jobStatus)) {
    const accepted = quotes.find((q) => q.status === "accepted");
    if (!accepted) return null;
    const profile = profileMap.get(accepted.providerId._id.toString());

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{t("quotes_acceptedTitle")}</h3>
          <QuoteStatusBadge status={accepted.status} />
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <ProviderAvatar name={accepted.providerId.name} avatar={accepted.providerId.avatar ?? undefined} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="font-semibold text-slate-900 text-sm">{accepted.providerId.name}</p>
                {accepted.providerId.isVerified && (
                  <span className="badge bg-blue-100 text-blue-700 text-xs">{t("quotes_verified")}</span>
                )}
                {profile?.isLocalProCertified && (
                  <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-200">
                    🎖️ {t("quotes_localProCert")}
                  </span>
                )}
              </div>
              {profile && (profile.avgRating ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {(profile.avgRating ?? 0).toFixed(1)} · {profile.completedJobCount} jobs
                </span>
              )}
              <p className="text-xs text-slate-500 mt-1">{t("quotes_timeline", { tl: accepted.timeline })}</p>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed">{accepted.message}</p>
              <div className="mt-2 flex items-center gap-3">
                <ProviderInfoButton
                  providerId={accepted.providerId._id.toString()}
                  providerName={accepted.providerId.name}
                />
                <Link
                  href={`/client/messages/${jobId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("quotes_messageProvider")}
                </Link>
              </div>
            </div>
          </div>
          <div className="sm:flex-shrink-0 sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <p className="text-xl font-bold text-slate-900">{formatCurrency(accepted.proposedAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t("quotes_providerGets")}{" "}
              <span className="font-medium text-slate-600">
                {formatCurrency(calculateCommission(accepted.proposedAmount).netAmount)}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── All quotes view (open status) ── */
  if (jobStatus !== "open") return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          {t("quotes_heading")}
        </h3>
        <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
          {quotes.length}
        </span>
      </div>

      {quotes.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">{t("quotes_noQuotesTitle")}</p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
              {t("quotes_noQuotesDesc")}
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {quotes.map((q) => {
            const profile    = profileMap.get(q.providerId._id.toString());
            const avgRating  = profile?.avgRating ?? 0;
            const jobsDone   = profile?.completedJobCount ?? 0;
            const isTopRated = avgRating >= 4.5 && jobsDone >= 3;
            const breakdown  = calculateCommission(q.proposedAmount);

            return (
              <li key={q._id.toString()} className="px-5 sm:px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <ProviderAvatar name={q.providerId.name} avatar={q.providerId.avatar ?? undefined} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-900 text-sm">{q.providerId.name}</p>
                        <QuoteStatusBadge status={q.status} />
                        {q.providerId.isVerified && (
                          <span className="badge bg-blue-100 text-blue-700 text-xs">{t("quotes_verified")}</span>
                        )}
                        {profile?.isLocalProCertified && (
                          <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-200">
                            🎖️ {t("quotes_localProCert")}
                          </span>
                        )}
                        {isTopRated && (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">{t("quotes_topRated")}</span>
                        )}
                      </div>
                      {(avgRating > 0 || jobsDone > 0) && (
                        <div className="flex items-center gap-3 mt-0.5">
                          {avgRating > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {avgRating.toFixed(1)}
                            </span>
                          )}
                          {jobsDone > 0 && (
                            <span className="text-xs text-slate-400">
                              {t("quotes_jobsDone", { n: jobsDone, s: jobsDone !== 1 ? "s" : "" })}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{t("quotes_timeline", { tl: q.timeline })}</p>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{q.message}</p>
                      <ProviderInfoButton
                        providerId={q.providerId._id.toString()}
                        providerName={q.providerId.name}
                      />
                    </div>
                  </div>

                  {/* Amount + actions — stacks below on mobile, right column on desktop */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 sm:flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="sm:text-right">
                      <p className="text-xl font-bold text-slate-900">
                        {formatCurrency(q.proposedAmount)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t("quotes_providerGets")}{" "}
                        <span className="font-medium text-slate-600">
                          {formatCurrency(breakdown.netAmount)}
                        </span>
                      </p>
                    </div>
                    {q.status === "pending" && (
                      <QuoteAcceptButton
                        quoteId={q._id.toString()}
                        proposedAmount={q.proposedAmount}
                        providerName={q.providerId.name}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
