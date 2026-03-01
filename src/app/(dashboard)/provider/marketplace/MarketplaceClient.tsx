"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Spinner";
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Search,
  SlidersHorizontal,
  Briefcase,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import type { IJob } from "@/types";
import { apiFetch } from "@/lib/fetchClient";
import { PhotoStrip } from "@/components/shared/JobPhotoGallery";

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type SortKey = "newest" | "oldest" | "budget_desc" | "budget_asc";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",      label: "Newest first"      },
  { value: "oldest",      label: "Oldest first"      },
  { value: "budget_desc", label: "Budget: High → Low" },
  { value: "budget_asc",  label: "Budget: Low → High" },
];

interface QuoteForm { proposedAmount: string; timeline: string; message: string; }

interface MarketplaceClientProps {
  initialJobs: IJob[];
  initialCategories: string[];
  initialQuotedJobIds: string[];
}

export default function MarketplaceClient({
  initialJobs,
  initialCategories,
  initialQuotedJobIds,
}: MarketplaceClientProps) {
  const [jobs, setJobs] = useState<IJob[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; job: IJob | null }>({ open: false, job: null });
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({ proposedAmount: "", timeline: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotedJobIds, setQuotedJobIds] = useState<Set<string>>(new Set(initialQuotedJobIds));
  const [categories] = useState<string[]>(initialCategories);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search);

  const fetchJobs = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: "open" });
      if (category !== "All") params.set("category", category);
      const res = await apiFetch(`/api/jobs?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.data);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [category]);

  const filtered = useMemo(() => {
    let list = [...jobs];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sort === "newest")      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest")      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "budget_desc") return b.budget - a.budget;
      if (sort === "budget_asc")  return a.budget - b.budget;
      return 0;
    });

    return list;
  }, [jobs, debouncedSearch, sort]);

  const hasFilters = category !== "All" || search.trim() !== "";

  function clearFilters() {
    setCategory("All");
    setSearch("");
    searchRef.current?.focus();
  }

  async function submitQuote() {
    if (!quoteModal.job) return;
    if (!quoteForm.proposedAmount || isNaN(Number(quoteForm.proposedAmount))) {
      toast.error("Please enter a valid amount"); return;
    }
    if (!quoteForm.timeline.trim()) { toast.error("Timeline is required"); return; }
    if (quoteForm.message.length < 20) { toast.error("Message must be at least 20 characters"); return; }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: quoteModal.job._id,
          proposedAmount: Number(quoteForm.proposedAmount),
          timeline: quoteForm.timeline,
          message: quoteForm.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "You have already submitted a quote for this job") {
          setQuotedJobIds((prev) => new Set(prev).add(quoteModal.job!._id.toString()));
          setQuoteModal({ open: false, job: null });
          toast.error("You've already quoted this job");
        } else {
          toast.error(data.error ?? "Failed to submit quote");
        }
        return;
      }
      toast.success("Quote submitted!");
      setQuotedJobIds((prev) => new Set(prev).add(quoteModal.job!._id.toString()));
      setQuoteModal({ open: false, job: null });
      setQuoteForm({ proposedAmount: "", timeline: "", message: "" });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openQuoteModal(job: IJob) {
    setQuoteForm({ proposedAmount: "", timeline: "", message: "" });
    setQuoteModal({ open: true, job });
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketplace</h2>
          <p className="text-slate-500 text-sm mt-0.5">Browse available jobs and submit quotes.</p>
        </div>
        <button
          onClick={() => fetchJobs(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40 mt-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3">
        {/* Top row: search + sort */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs…"
              className="input pl-9 pr-8 text-sm w-56"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input pl-8 pr-8 text-sm appearance-none w-48 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap items-center">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === c
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {!isLoading && (
        <p className="text-xs text-slate-400">
          {filtered.length === 0 ? (
            <>No jobs found{category !== "All" && <> in <span className="font-medium">{category}</span></>}{debouncedSearch && <> matching &ldquo;<span className="font-medium">{debouncedSearch}</span>&rdquo;</>}</>
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-slate-600">{filtered.length}</span>
              {jobs.length !== filtered.length && <> of <span className="font-semibold text-slate-600">{jobs.length}</span></>}
              {" "}open job{filtered.length !== 1 ? "s" : ""}
              {category !== "All" && <> in <span className="font-medium text-slate-600">{category}</span></>}
              {debouncedSearch && <> matching <span className="font-medium text-slate-600">&ldquo;{debouncedSearch}&rdquo;</span></>}
            </>
          )}
        </p>
      )}

      {/* Jobs grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-14 flex flex-col items-center text-center gap-3">
          <Briefcase className="h-8 w-8 text-slate-300" />
          <div>
            <p className="text-sm font-medium text-slate-600">No jobs found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasFilters ? "Try a different category, clear the search, or check back later." : "No open jobs right now. Check back soon."}
            </p>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((job) => {
            const id = job._id.toString();
            const quoted = quotedJobIds.has(id);
            const expanded = expandedId === id;
            const isLong = job.description.length > 120;

            return (
              <div
                key={id}
                className={`bg-white rounded-xl border shadow-card flex flex-col transition-shadow hover:shadow-card-hover ${
                  quoted ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                {/* Top strip */}
                <div className={`flex items-center justify-between px-5 py-3 border-b text-xs ${
                  quoted ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50/60"
                }`}>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                    <Briefcase className="h-3 w-3" />
                    {job.category}
                  </span>
                  <span className="font-bold text-slate-900 text-sm tabular-nums">{formatCurrency(job.budget)}</span>
                </div>

                {/* Body */}
                <div className="flex-1 px-5 py-4 space-y-2.5">
                  <h3 className="font-semibold text-slate-900 leading-snug">{job.title}</h3>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />{job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />{formatDate(job.scheduleDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />Posted {formatRelativeTime(job.createdAt)}
                    </span>
                  </div>

                  <div>
                    <p className={`text-sm text-slate-600 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
                      {job.description}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : id)}
                        className="mt-1 flex items-center gap-0.5 text-xs text-primary hover:underline font-medium"
                      >
                        {expanded ? (
                          <><ChevronUp className="h-3 w-3" />Show less</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" />Show more</>
                        )}
                      </button>
                    )}
                  </div>

                  {job.beforePhoto && job.beforePhoto.length > 0 && (
                    <div>
                      <PhotoStrip urls={job.beforePhoto} label="Attachments" />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 tabular-nums">
                    Budget: <span className="font-semibold text-slate-700">{formatCurrency(job.budget)}</span>
                  </span>
                  {quoted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Quote Sent
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => openQuoteModal(job)}>
                      Submit Quote
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quote modal */}
      <Modal isOpen={quoteModal.open} onClose={() => setQuoteModal({ open: false, job: null })} title="Submit a Quote">
        <div className="space-y-4">
          {/* Job summary */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-1.5">
            <p className="text-xs text-slate-500">Job</p>
            <p className="text-sm font-semibold text-slate-900">{quoteModal.job?.title}</p>
            <p className="text-xs text-slate-500">
              Client budget:{" "}
              <span className="font-medium text-slate-700">{formatCurrency(quoteModal.job?.budget ?? 0)}</span>
            </p>
            {quoteModal.job?.beforePhoto && quoteModal.job.beforePhoto.length > 0 && (
              <div className="pt-1">
                <PhotoStrip urls={quoteModal.job.beforePhoto} label="Attachments" />
              </div>
            )}
          </div>

          <div>
            <label className="label block mb-1">Your Proposed Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₱</span>
              <input
                type="number"
                min="1"
                className="input w-full pl-7"
                placeholder="e.g. 1500"
                value={quoteForm.proposedAmount}
                onChange={(e) => setQuoteForm((f) => ({ ...f, proposedAmount: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label block mb-1">Timeline</label>
            <input
              className="input w-full"
              placeholder="e.g. 2-3 hours, 1 day"
              value={quoteForm.timeline}
              onChange={(e) => setQuoteForm((f) => ({ ...f, timeline: e.target.value }))}
            />
          </div>

          <div>
            <label className="label block mb-1">Message to Client</label>
            <textarea
              className="input w-full min-h-[100px] resize-none"
              placeholder="Introduce yourself and explain your approach…"
              value={quoteForm.message}
              onChange={(e) => setQuoteForm((f) => ({ ...f, message: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1 flex justify-between">
              <span>Min 20 characters</span>
              <span className={quoteForm.message.length > 1000 ? "text-red-500" : ""}>{quoteForm.message.length}/1000</span>
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setQuoteModal({ open: false, job: null })}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={submitQuote}>Submit Quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
