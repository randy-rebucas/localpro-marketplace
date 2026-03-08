"use client";

import { MapPin, Zap, Tag } from "lucide-react";
import { formatPeso } from "../utils";
import type { BoardJob } from "../types";

const JOB_TAG_LABELS: Record<string, string> = {
  peso:        "PESO",
  lgu_project: "LGU Project",
  gov_program: "Gov't Program",
  emergency:   "Emergency",
  internship:  "Internship",
};

const JOB_TAG_COLORS: Record<string, string> = {
  peso:        "bg-blue-500/20 text-blue-300",
  lgu_project: "bg-emerald-500/20 text-emerald-300",
  gov_program: "bg-violet-500/20 text-violet-300",
  emergency:   "bg-red-500/20 text-red-300",
  internship:  "bg-amber-500/20 text-amber-300",
};

export function UrgentJobsStrip({ jobs }: { jobs: BoardJob[] }) {
  // Show PESO / LGU / gov jobs; fall back to highest-budget if none
  const pesoJobs = jobs.filter(
    (j) => j.jobSource === "peso" || j.jobSource === "lgu" ||
           (j.jobTags && (j.jobTags.includes("peso") || j.jobTags.includes("lgu_project") || j.jobTags.includes("gov_program")))
  );
  const featured = (pesoJobs.length > 0 ? pesoJobs : jobs).slice(0, 3);
  if (!featured.length) return null;

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm leading-none">🏛️</span>
        <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">PESO Jobs</span>
      </div>
      <div className="flex flex-col gap-2">
        {featured.map((job) => (
          <div key={job._id} className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-2 sm:p-2.5">
            {/* Category + badges */}
            <div className="flex items-center flex-wrap gap-1 mb-0.5">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider leading-none">
                {job.category}
              </span>
              {job.isPriority && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold">
                  <Zap className="h-2 w-2" />
                  Priority
                </span>
              )}
              {job.jobSource && job.jobSource !== "private" && (
                <span className="inline-block px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-semibold">
                  {job.jobSource.toUpperCase()}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-white line-clamp-2 mt-0.5 leading-snug">
              {job.title}
            </p>

            <div className="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
              <div className="flex items-center gap-0.5 text-[11px] sm:text-xs text-slate-400 min-w-0">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{job.location}</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-300 flex-shrink-0">
                {formatPeso(job.budget)}
              </span>
            </div>

            {/* Job tags */}
            {job.jobTags && job.jobTags.length > 0 && (
              <div className="flex items-center flex-wrap gap-1 mt-1.5">
                <Tag className="h-2 w-2 text-slate-500 flex-shrink-0" />
                {job.jobTags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-block px-1 py-0.5 rounded text-[9px] font-semibold ${JOB_TAG_COLORS[tag] ?? "bg-white/10 text-slate-400"}`}
                  >
                    {JOB_TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
