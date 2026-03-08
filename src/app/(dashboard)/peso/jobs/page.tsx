"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlusCircle, Star, Briefcase, Search, X, MapPin, CalendarDays, Tag, Zap, FileText, StickyNote, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";

interface PesoJob {
  _id: string;
  title: string;
  category: string;
  budget: number;
  location: string;
  status: string;
  jobTags: string[];
  isPriority: boolean;
  jobSource?: string;
  description?: string;
  specialInstructions?: string;
  scheduleDate: string;
  createdAt: string;
}

const TAG_META: Record<string, { label: string; color: string }> = {
  peso:        { label: "PESO",        color: "bg-blue-100 text-blue-700" },
  lgu_project: { label: "LGU Project", color: "bg-indigo-100 text-indigo-700" },
  gov_program: { label: "Gov Program", color: "bg-violet-100 text-violet-700" },
  emergency:   { label: "Emergency",   color: "bg-red-100 text-red-700" },
  internship:  { label: "Internship",  color: "bg-emerald-100 text-emerald-700" },
};

const SOURCE_META: Record<string, { label: string; color: string }> = {
  peso: { label: "PESO",    color: "bg-blue-50 text-blue-600" },
  lgu:  { label: "LGU",     color: "bg-teal-50 text-teal-600" },
};

const STATUS_META: Record<string, string> = {
  open:        "bg-emerald-50 text-emerald-700",
  completed:   "bg-slate-100 text-slate-500",
  in_progress: "bg-blue-50 text-blue-700",
  cancelled:   "bg-red-50 text-red-500",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function PesoJobsPage() {
  const [jobs, setJobs] = useState<PesoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<PesoJob | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch("/api/peso/jobs")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = jobs.filter((j) =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.category.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">PESO Job Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${total} government job${total !== 1 ? "s" : ""} posted`}
          </p>
        </div>
        <Link
          href="/peso/jobs/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          Post a Job
        </Link>
      </div>

      {/* Search */}
      {!loading && jobs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, or location…"
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex gap-4 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-48" />
                <div className="h-3 bg-slate-100 rounded w-64" />
              </div>
              <div className="space-y-2 shrink-0">
                <div className="h-5 bg-slate-100 rounded-full w-16" />
                <div className="h-3 bg-slate-100 rounded w-20 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-14 flex flex-col items-center gap-2 text-slate-400">
          <Briefcase className="h-8 w-8 opacity-30" />
          <p className="text-sm">
            {search ? `No jobs matching "${search}".` : "No PESO jobs posted yet."}
          </p>
          {search ? (
            <button onClick={() => setSearch("")} className="text-xs text-blue-500 hover:underline">
              Clear search
            </button>
          ) : (
            <Link href="/peso/jobs/new" className="text-xs text-blue-500 hover:underline">
              Post your first job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {search && filtered.length !== jobs.length && (
            <p className="text-xs text-slate-400 tabular-nums">
              Showing {filtered.length} of {jobs.length} jobs
            </p>
          )}
          {filtered.map((job) => (
            <button
              key={job._id}
              onClick={() => setPreview((p) => p?._id === job._id ? null : job)}
              className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm flex items-start justify-between gap-4 transition-colors ${
                preview?._id === job._id
                  ? "border-blue-400 ring-1 ring-blue-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {job.isPriority && (
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 truncate">{job.title}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {job.jobTags.map((t) => (
                    <span
                      key={t}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TAG_META[t]?.color ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {TAG_META[t]?.label ?? t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {job.category} &middot; {job.location} &middot; {formatCurrency(job.budget)}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_META[job.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {job.status.replace(/_/g, " ")}
                </span>
                <p className="text-xs text-slate-400">{fmt(job.scheduleDate)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Preview Drawer */}
      {preview && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setPreview(null)}
          />
          {/* Panel */}
          <div
            ref={drawerRef}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden border-l border-slate-200"
          >
            {/* Drawer header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {preview.isPriority && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Zap className="h-2.5 w-2.5" />
                      Priority
                    </span>
                  )}
                  {preview.jobSource && SOURCE_META[preview.jobSource] && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SOURCE_META[preview.jobSource].color}`}>
                      {SOURCE_META[preview.jobSource].label}
                    </span>
                  )}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_META[preview.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {preview.status.replace(/_/g, " ")}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-800 leading-snug">{preview.title}</h2>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Category</p>
                  <p className="text-sm font-semibold text-slate-700">{preview.category}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-0.5">Budget</p>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(preview.budget)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex gap-2 items-center col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{preview.location}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex gap-2 items-center">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Schedule</p>
                    <p className="text-sm font-semibold text-slate-700">{fmt(preview.scheduleDate)}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex gap-2 items-center">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Posted</p>
                    <p className="text-sm font-semibold text-slate-700">{fmt(preview.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {preview.jobTags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.jobTags.map((t) => (
                      <span
                        key={t}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${TAG_META[t]?.color ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {TAG_META[t]?.label ?? t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {preview.description && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {preview.description}
                  </p>
                </div>
              )}

              {/* Special instructions */}
              {preview.specialInstructions && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <StickyNote className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Special Instructions</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    {preview.specialInstructions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
