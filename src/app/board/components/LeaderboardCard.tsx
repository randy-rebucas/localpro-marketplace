"use client";

import Image from "next/image";
import { Star, Award, CheckCircle2 } from "lucide-react";
import { RANK_MEDAL } from "../constants";
import type { LeaderboardEntry } from "../types";

export function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        entry.rank === 1
          ? "bg-amber-500/10 border border-amber-500/20"
          : entry.rank === 2
          ? "bg-slate-400/10 border border-slate-400/20"
          : entry.rank === 3
          ? "bg-orange-700/10 border border-orange-700/20"
          : "bg-white/[0.05] border border-white/[0.08]"
      }`}
    >
      <span className="text-2xl flex-shrink-0 w-8 text-center leading-none">
        {RANK_MEDAL[entry.rank - 1]}
      </span>

      {entry.avatar ? (
        <Image
          src={entry.avatar}
          alt={entry.name}
          width={40}
          height={40}
          className="rounded-full object-cover flex-shrink-0 w-10 h-10 border-2 border-white/20"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm border-2 border-white/20">
          {entry.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-base font-semibold text-white truncate">{entry.name}</p>
          {entry.isLocalProCertified && (
            <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" aria-label="LocalPro Certified" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.avgRating > 0 && (
            <span className="flex items-center gap-0.5 text-sm text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {entry.avgRating.toFixed(1)}
            </span>
          )}
          <span className="text-sm text-slate-400">{entry.completedJobCount} jobs</span>
          {entry.completionRate > 0 && (
            <span className="flex items-center gap-0.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {entry.completionRate}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
