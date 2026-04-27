"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PlusCircle, Star, Briefcase, Search, X, MapPin, CalendarDays, Tag, Zap, FileText, StickyNote, Clock, Users, CheckCircle2, XCircle, User, ExternalLink, Archive, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";
import Modal from "@/components/ui/Modal";

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

interface Applicant {
  _id: string;
  applicantId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string | null;
    isVerified?: boolean;
  };
  coverLetter: string;
  availability: string;
  resumeUrl?: string;
  status: "pending" | "shortlisted" | "rejected" | "hired";
  createdAt: string;
}

const APPLICANT_STATUS_META: Record<Applicant["status"], { label: string; color: string }> = {
  pending:     { label: "Pending",     color: "bg-slate-100 text-slate-600" },
  shortlisted: { label: "Shortlisted", color: "bg-blue-100 text-blue-700" },
  rejected:    { label: "Rejected",    color: "bg-red-100 text-red-600" },
  hired:       { label: "Hired",       color: "bg-emerald-100 text-emerald-700" },
};

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<PesoJob | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantUpdating, setApplicantUpdating] = useState<Set<string>>(new Set());
  const [closeJobId, setCloseJobId] = useState<string | null>(null);
  const [closingJobId, setClosingJobId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  const loadJobs = async (pageNum: number, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await apiFetch(`/api/peso/jobs?page=${pageNum}&limit=${limit}`);
      const data = await res.json();
      if (isLoadMore) {
        setJobs((prev) => [...prev, ...(data.data ?? [])]);
      } else {
        setJobs(data.data ?? []);
      }
      setTotal(data.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load jobs:", err);
      if (!isLoadMore) toast.error("Failed to load jobs. Please refresh.");
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Load initial jobs
  useEffect(() => {
    loadJobs(1);
  }, []);

  const fetchApplicants = useCallback((jobId: string) => {
    setApplicantsLoading(true);
    setApplicants([]);
    apiFetch(`/api/apply/${jobId}`)
      .then((r) => r.json())
      .then((d) => setApplicants(d.applicants ?? []))
      .catch(() => setApplicants([]))
      .finally(() => setApplicantsLoading(false));
  }, []);

  async function updateApplicantStatus(jobId: string, appId: string, status: Applicant["status"]) {
    setApplicantUpdating((prev) => new Set(prev).add(appId));
    try {
      const res = await apiFetch(`/api/apply/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status }),
      });
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, status } : a))
        );
      }
    } finally {
      setApplicantUpdating((prev) => { const s = new Set(prev); s.delete(appId); return s; });
    }
  }

  async function handleCloseJob(jobId: string) {
    setClosingJobId(jobId);
    try {
      const res = await apiFetch(`/api/peso/jobs/${jobId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const updated = await res.json();
        setJobs((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, status: updated.status } : j))
        );
        setCloseJobId(null);
        if (preview?._id === jobId) {
          setPreview({ ...preview, status: updated.status });
        }
        toast.success("Job archived successfully");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to close job");
      }
    } catch (err) {
      toast.error("An error occurred");
      console.error(err);
    } finally {
      setClosingJobId(null);
    }
  }

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
              onClick={() => {
                const next = preview?._id === job._id ? null : job;
                setPreview(next);
                if (next) fetchApplicants(next._id);
                else setApplicants([]);
              }}
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
                <div className="flex items-center justify-end gap-1.5">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_META[job.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {job.status.replace(/_/g, " ")}
                  </span>
                  {job.status === "open" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCloseJobId(job._id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Archive job"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400">{fmt(job.scheduleDate)}</p>
              </div>
            </button>
          ))}
          {/* Load More Button */}
          {jobs.length < total && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => loadJobs(page + 1, true)}
                disabled={loadingMore}
                className="px-6 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 rounded-lg transition-colors flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  `Load More (${jobs.length} of ${total})`
                )}
              </button>
            </div>
          )}
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

              {/* Applicants */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applicants</p>
                    {!applicantsLoading && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {applicants.length}
                      </span>
                    )}
                  </div>
                </div>

                {applicantsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-20" />
                    ))}
                  </div>
                ) : applicants.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-6 text-slate-400">
                    <User className="h-6 w-6 opacity-40" />
                    <p className="text-xs">No applicants yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {applicants.map((app) => {
                      const meta = APPLICANT_STATUS_META[app.status];
                      return (
                        <div key={app._id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
                          {/* Applicant header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                                {app.applicantId.name?.[0] ?? "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {app.applicantId.name}
                                  {app.applicantId.isVerified && (
                                    <CheckCircle2 className="inline h-3 w-3 text-emerald-500 ml-1" />
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">{app.applicantId.email}</p>
                              </div>
                            </div>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>

                          {/* Availability */}
                          <p className="text-[11px] text-slate-500">
                            <span className="font-semibold">Availability:</span> {app.availability}
                          </p>

                          {/* Resume — only render if URL uses http/https scheme */}
                          {app.resumeUrl && (() => {
                            try {
                              const { protocol } = new URL(app.resumeUrl);
                              if (protocol !== "https:" && protocol !== "http:") return null;
                            } catch { return null; }
                            return (
                              <a
                                href={app.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View Resume
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            );
                          })()}

                          {/* Cover letter */}
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {app.coverLetter}
                          </p>

                          {/* Status actions */}
                          {app.status !== "hired" && (
                            <div className="flex gap-1.5 flex-wrap pt-1">
                              {app.status !== "shortlisted" && (
                                <button
                                  disabled={applicantUpdating.has(app._id)}
                                  onClick={() => updateApplicantStatus(preview._id, app._id, "shortlisted")}
                                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                >
                                  Shortlist
                                </button>
                              )}
                              <button
                                disabled={applicantUpdating.has(app._id)}
                                onClick={() => updateApplicantStatus(preview._id, app._id, "hired")}
                                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                              >
                                Hire
                              </button>
                              {app.status !== "rejected" && (
                                <button
                                  disabled={applicantUpdating.has(app._id)}
                                  onClick={() => updateApplicantStatus(preview._id, app._id, "rejected")}
                                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                  <XCircle className="inline h-3 w-3 mr-0.5" />Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Close Job Modal */}
      <Modal
        isOpen={closeJobId !== null}
        onClose={() => setCloseJobId(null)}
        title="Archive Job"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to archive <strong>{jobs.find((j) => j._id === closeJobId)?.title}</strong>? This will be marked as completed and won't appear in the open jobs list.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setCloseJobId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => closeJobId && handleCloseJob(closeJobId)}
              disabled={closingJobId !== null}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-lg transition-colors flex items-center gap-2"
            >
              {closingJobId === closeJobId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Archiving…
                </>
              ) : (
                "Archive Job"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
