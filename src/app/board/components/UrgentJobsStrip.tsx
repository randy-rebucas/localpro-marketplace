"use client";

import { MapPin } from "lucide-react";
import { formatPeso } from "../utils";
import type { BoardJob } from "../types";

export function UrgentJobsStrip({ jobs }: { jobs: BoardJob[] }) {
  const urgent = [...jobs].sort((a, b) => b.budget - a.budget).slice(0, 2);
  if (!urgent.length) return null;

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm leading-none">🔥</span>
        <span className="text-xs font-bold text-red-300 uppercase tracking-widest">Featured Jobs</span>
      </div>
      <div className="flex flex-col gap-2">
        {urgent.map((job) => (
          <div key={job._id} className="bg-red-900/20 border border-red-500/30 rounded-xl p-2 sm:p-2.5">
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider leading-none">
              {job.category}
            </span>
            <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 mt-0.5 leading-snug">
              {job.title}
            </p>
            <div className="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
              <div className="flex items-center gap-0.5 text-[11px] sm:text-xs text-slate-400 min-w-0">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{job.location}</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-red-300 flex-shrink-0">
                {formatPeso(job.budget)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
