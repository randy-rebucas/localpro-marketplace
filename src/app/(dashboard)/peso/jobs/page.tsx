"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PesoJob {
  _id: string;
  title: string;
  category: string;
  budget: number;
  location: string;
  status: string;
  jobTags: string[];
  isPriority: boolean;
  scheduleDate: string;
  createdAt: string;
}

const TAG_COLORS: Record<string, string> = {
  peso:        "bg-blue-100 text-blue-700",
  lgu_project: "bg-indigo-100 text-indigo-700",
  gov_program: "bg-violet-100 text-violet-700",
  emergency:   "bg-red-100 text-red-700",
  internship:  "bg-emerald-100 text-emerald-700",
};
const TAG_LABELS: Record<string, string> = {
  peso:        "PESO",
  lgu_project: "LGU Project",
  gov_program: "Gov Program",
  emergency:   "Emergency",
  internship:  "Internship",
};

export default function PesoJobsPage() {
  const [jobs, setJobs] = useState<PesoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/peso/jobs")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">PESO Job Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} government job{total !== 1 ? "s" : ""} posted</p>
        </div>
        <Link
          href="/peso/jobs/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Post a Job
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No PESO jobs posted yet.</p>
          <Link href="/peso/jobs/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Post your first job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {job.isPriority && (
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  )}
                  <span className="font-semibold text-slate-800 truncate">{job.title}</span>
                  {job.jobTags.map((t) => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[t] ?? "bg-slate-100 text-slate-600"}`}>
                      {TAG_LABELS[t] ?? t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {job.category} &middot; {job.location} &middot; {formatCurrency(job.budget)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  job.status === "open" ? "bg-emerald-50 text-emerald-700" :
                  job.status === "completed" ? "bg-slate-100 text-slate-500" :
                  "bg-amber-50 text-amber-700"
                }`}>
                  {job.status.replace("_", " ")}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(job.scheduleDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
