import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { reviewRepository } from "@/repositories/review.repository";
import { getProviderTier } from "@/lib/tier";
import Link from "next/link";
import { TrendingUp, Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function TierWidget({ userId }: { userId: string }) {
  const t = await getTranslations("providerPages");
  const [profile, ratingSummary, streak] = await Promise.all([
    providerProfileRepository.findByUserId(userId),
    reviewRepository.getProviderRatingSummary(userId),
    reviewRepository.getFiveStarStreak(userId),
  ]);

  const completedJobCount = profile?.completedJobCount ?? 0;
  const completionRate = profile?.completionRate ?? 0;
  const avgRating = ratingSummary?.avgRating ?? 0;

  const tierInfo = getProviderTier(completedJobCount, avgRating, completionRate);

  return (
    <Link
      href="/provider/profile"
      className="flex items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/20 rounded-xl px-5 py-3.5 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0 text-base leading-none">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              {tierInfo.emoji} {tierInfo.label}
            </span>
            {streak >= 3 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5">
                <Flame className="h-3 w-3" />
                {t("provDash_tierStreak", { n: streak })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5 max-w-[120px]">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${tierInfo.progress}%` }}
              />
            </div>
            {tierInfo.next ? (
              <span className="text-xs text-slate-400">→ {tierInfo.next}</span>
            ) : (
              <span className="text-xs text-violet-500 font-medium">{t("provDash_tierTopTier")}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-slate-500">
          {completedJobCount !== 1 ? t("provDash_tierJobCountPlural", { n: completedJobCount }) : t("provDash_tierJobCount", { n: completedJobCount })}
        </p>
        <p className="text-xs text-primary/70 group-hover:text-primary transition-colors">
          {t("provDash_tierViewProfile")}
        </p>
      </div>
    </Link>
  );
}
