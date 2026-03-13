"use client";

import { Building2, MapPin, Zap } from "lucide-react";
import { formatPeso } from "../utils";
import type { BoardJob } from "../types";

const TAG_LABELS: Record<string, string> = {
  peso:        "PESO",
  lgu_project: "LGU Project",
  gov_program: "Gov't Program",
  emergency:   "Emergency",
  internship:  "Internship",
};

const TAG_COLORS: Record<string, string> = {
  peso:        "bg-blue-500/20 text-blue-300 border-blue-500/30",
  lgu_project: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  gov_program: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  emergency:   "bg-red-500/20 text-red-300 border-red-500/30",
  internship:  "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const SOURCE_COLORS: Record<string, string> = {
  peso: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  lgu:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const SOURCE_LABELS: Record<string, string> = {
  peso: "PESO",
  lgu:  "LGU",
};

/** Official / gov't jobs (PESO & LGU source or tagged) — fall back to highest-budget if none. */
function getFeatured(jobs: BoardJob[]): BoardJob[] {
  const official = jobs.filter(
    (j) =>
      j.jobSource === "peso" ||
      j.jobSource === "lgu" ||
      j.jobTags?.some((t) => t === "peso" || t === "lgu_project" || t === "gov_program")
  );
  const pool = official.length > 0 ? official : [...jobs].sort((a, b) => b.budget - a.budget);
  return pool.slice(0, 2);
}

export function UrgentJobsStrip({ jobs }: { jobs: BoardJob[] }) {
  const featured = getFeatured(jobs);

  return (
    <div className="flex-shrink-0">
      {/* Section header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-[11px] font-bold text-blue-300 uppercase tracking-widest leading-none">
          Gov't / PESO Jobs
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {featured.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-6 px-4 text-center">
            <Building2 className="h-6 w-6 text-slate-600" />
            <p className="text-xs font-semibold text-slate-500 leading-snug">
              No Gov't or PESO jobs<br />posted right now
            </p>
            <span className="text-[10px] text-slate-600">Check back soon</span>
          </div>
        ) : (
          featured.map((job) => {
          const hasTags = job.jobTags && job.jobTags.length > 0;
          const isOfficial = job.jobSource === "peso" || job.jobSource === "lgu";

          return (
            <div
              key={job._id}
              className="relative bg-white/[0.06] border border-white/10 rounded-2xl p-3 overflow-hidden
                         hover:bg-white/[0.09] transition-colors"
            >
              {/* Left accent bar */}
              <div className="absolute left-0 inset-y-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-blue-400 to-emerald-400" />

              {/* Badges row */}
              <div className="flex items-center flex-wrap gap-1 mb-1.5 pl-1">
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase tracking-wider">
                  {job.category}
                </span>

                {job.isPriority && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold">
                    <Zap className="h-2.5 w-2.5" />
                    Priority
                  </span>
                )}

                {isOfficial && (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                      SOURCE_COLORS[job.jobSource!] ?? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                    }`}
                  >
                    {SOURCE_LABELS[job.jobSource!] ?? job.jobSource!.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="text-xs font-bold text-white line-clamp-2 leading-snug pl-1 mb-2">
                {job.title}
              </p>

              {/* Location + budget */}
              <div className="flex items-center justify-between gap-2 pl-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400 min-w-0">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-300 flex-shrink-0 tabular-nums">
                  {formatPeso(job.budget)}
                </span>
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
}
