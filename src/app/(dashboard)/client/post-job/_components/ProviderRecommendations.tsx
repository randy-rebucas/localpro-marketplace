"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/fetchClient";
import { Bot, Star, BadgeCheck, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RecommendedProvider } from "./types";

interface Props {
  category: string;
  budget: number;
}

export function ProviderRecommendations({ category, budget }: Props) {
  const t = useTranslations("clientPages");
  const [providers, setProviders] = useState<RecommendedProvider[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!category || !budget) return;
    setLoading(true);
    apiFetch(`/api/ai/recommend-providers?category=${encodeURIComponent(category)}&budget=${budget}`)
      .then((r) => r.json())
      .then((data: { providers?: RecommendedProvider[] }) => {
        if (data.providers) setProviders(data.providers);
      })
      .catch(() => { /* silently hide */ })
      .finally(() => setLoading(false));
  }, [category, budget]);

  if (!category || !budget) return null;
  if (!loading && providers.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-100 bg-violet-50/70">
        <div className="p-1.5 bg-violet-100 rounded-lg">
          <Bot className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-violet-900">{t("postJob_aiMatchedProviders")}</p>
          <p className="text-[11px] text-violet-500">{t("postJob_aiMatchedSub")}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-violet-100/60" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-violet-100/70">
          {providers.map((p, idx) => (
            <li key={p.providerId} className="px-4 py-3 flex items-start gap-3 hover:bg-violet-50/40 transition-colors">
              {/* Rank badge */}
              <div className="flex-shrink-0 relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
                  {p.avatar
                    ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover rounded-full" />
                    : p.name.charAt(0).toUpperCase()}
                </div>
                {idx === 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">1</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                  {idx === 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5">
                      <BadgeCheck className="h-3 w-3" /> {t("postJob_topMatch")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                    <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                    {p.avgRating.toFixed(1)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">{t("postJob_jobsDone", { count: p.completedJobCount })}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug italic">&ldquo;{p.reason}&rdquo;</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
            </li>
          ))}
        </ul>
      )}
      <div className="px-4 py-2 border-t border-violet-100 bg-violet-50/50">
        <p className="text-[11px] text-violet-400 text-center">{t("postJob_aiMatchFooter")}</p>
      </div>
    </div>
  );
}
