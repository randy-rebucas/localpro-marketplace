"use client";

import { Trophy } from "lucide-react";
import { RANK_MEDAL } from "../constants";
import type { LeaderboardEntry } from "../types";

function getProviderBadges(entry: LeaderboardEntry): { icon: string; label: string }[] {
  const badges: { icon: string; label: string }[] = [];
  if (entry.completionRate >= 90)     badges.push({ icon: "🏆", label: "Fast Responder" });
  if (entry.avgRating >= 4.8)         badges.push({ icon: "⭐", label: "Top Rated" });
  if (entry.completedJobCount >= 10)  badges.push({ icon: "🔥", label: "10 Jobs Done" });
  return badges;
}

const BADGE_LEGEND = [
  { icon: "🏆", label: "Fast Responder" },
  { icon: "⭐", label: "Top Rated" },
  { icon: "🔥", label: "10 Jobs Done" },
];

export function ProviderAchievementsWidget({
  entries,
  className,
}: {
  entries: LeaderboardEntry[];
  className?: string;
}) {
  const withBadges = entries.filter((e) => getProviderBadges(e).length > 0).slice(0, 3);
  if (!withBadges.length) return null;

  return (
    <div
      className={
        className ??
        "w-56 xl:w-64 self-end flex-shrink-0 rounded-2xl bg-[#1a3050]/90 backdrop-blur-sm border border-amber-400/20 shadow-xl p-3 flex flex-col gap-2"
      }
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Trophy className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
        <p className="text-xs font-bold text-amber-300 uppercase tracking-widest leading-none">
          Provider Achievements
        </p>
      </div>
      <ul className="space-y-1.5">
        {withBadges.map((entry) => {
          const badges = getProviderBadges(entry);
          return (
            <li key={entry._id} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center flex-shrink-0">{RANK_MEDAL[entry.rank - 1]}</span>
              <span className="text-sm text-white font-medium truncate flex-1">{entry.name}</span>
              <div className="flex gap-0.5 flex-shrink-0">
                {badges.slice(0, 2).map((b) => (
                  <span key={b.label} title={b.label} className="text-sm leading-none">
                    {b.icon}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 pt-1.5 flex flex-wrap gap-1">
        {BADGE_LEGEND.map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 bg-white/5 rounded px-1 py-0.5"
          >
            {b.icon} {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
