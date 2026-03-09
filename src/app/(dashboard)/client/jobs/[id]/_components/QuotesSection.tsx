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
  const quotes = await quoteRepository.findForJobWithProvider(jobId);

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
          <h3 className="font-semibold text-slate-900">Accepted Quote</h3>
          <QuoteStatusBadge status={accepted.status} />
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <ProviderAvatar name={accepted.providerId.name} avatar={accepted.providerId.avatar ?? undefined} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="font-semibold text-slate-900 text-sm">{accepted.providerId.name}</p>
                {accepted.providerId.isVerified && (
                  <span className="badge bg-blue-100 text-blue-700 text-xs">Verified</span>
                )}
                {profile?.isLocalProCertified && (
                  <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-200">
                    🎖️ LocalPro Certified
                  </span>
                )}
              </div>
              {profile && (profile.avgRating ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {(profile.avgRating ?? 0).toFixed(1)} · {profile.completedJobCount} jobs
                </span>
              )}
              <p className="text-xs text-slate-500 mt-1">Timeline: {accepted.timeline}</p>
              <ProviderInfoButton
                providerId={accepted.providerId._id.toString()}
                providerName={accepted.providerId.name}
              />
              <div className="mt-2">
                <Link
                  href={`/client/messages/${jobId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message Provider
                </Link>
              </div>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed">{accepted.message}</p>
            </div>
          </div>
          <div className="sm:flex-shrink-0 sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <p className="text-xl font-bold text-slate-900">{formatCurrency(accepted.proposedAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Provider gets{" "}
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
          Quotes
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
            <p className="text-sm font-semibold text-slate-600">No quotes yet</p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
              Providers are reviewing your job. Quotes usually arrive within the hour once
              your job is approved.
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
                        {q.providerId.isVerified && (
                          <span className="badge bg-blue-100 text-blue-700 text-xs">Verified</span>
                        )}
                        {profile?.isLocalProCertified && (
                          <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-200">
                            🎖️ LocalPro Certified
                          </span>
                        )}
                        {isTopRated && (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">⭐ Top Rated</span>
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
                              {jobsDone} job{jobsDone !== 1 ? "s" : ""} completed
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-1">Timeline: {q.timeline}</p>
                      <ProviderInfoButton
                        providerId={q.providerId._id.toString()}
                        providerName={q.providerId.name}
                      />
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{q.message}</p>
                    </div>
                  </div>

                  {/* Amount + actions — stacks below on mobile, right column on desktop */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 sm:flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="sm:text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(q.proposedAmount)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Provider gets{" "}
                        <span className="font-medium text-slate-600">
                          {formatCurrency(breakdown.netAmount)}
                        </span>
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2">
                      <QuoteStatusBadge status={q.status} />
                      <div className="flex items-center gap-2">
                        {q.status === "pending" && (
                          <QuoteAcceptButton
                            quoteId={q._id.toString()}
                            proposedAmount={q.proposedAmount}
                            providerName={q.providerId.name}
                          />
                        )}
                        <Link
                          href={`/client/messages/${jobId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message
                        </Link>
                      </div>
                    </div>
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
