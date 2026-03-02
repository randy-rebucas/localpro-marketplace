"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
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

const PAGE_SIZE = 12;

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
  const [isGeneratingQuoteMsg, setIsGeneratingQuoteMsg] = useState(false);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [page, setPage] = useState(1);
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

    if (category !== "All") {
      list = list.filter((j) => j.category === category);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q)
      );
    }

    const min = minBudget !== "" ? Number(minBudget) : null;
    const max = maxBudget !== "" ? Number(maxBudget) : null;
    if (min !== null && !isNaN(min)) list = list.filter((j) => j.budget >= min);
    if (max !== null && !isNaN(max)) list = list.filter((j) => j.budget <= max);

    list.sort((a, b) => {
      if (sort === "newest")      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest")      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "budget_desc") return b.budget - a.budget;
      if (sort === "budget_asc")  return a.budget - b.budget;
      return 0;
    });

    return list;
  }, [jobs, category, debouncedSearch, sort, minBudget, maxBudget]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, category, sort, minBudget, maxBudget]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = category !== "All" || search.trim() !== "" || minBudget !== "" || maxBudget !== "";

  function clearFilters() {
    setCategory("All");
    setSearch("");
    setMinBudget("");
    setMaxBudget("");
    setPage(1);
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

  async function generateQuoteMessage() {
    if (!quoteModal.job) return;
    setIsGeneratingQuoteMsg(true);
    try {
      const res = await apiFetch("/api/ai/generate-quote-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: quoteModal.job.title,
          jobDescription: quoteModal.job.description,
          jobBudget: quoteModal.job.budget,
          category: quoteModal.job.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeRequired) {
          toast(data.error ?? "AI features require Gold tier.", {
            icon: "🥇",
            style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
            duration: 5000,
          });
        } else {
          toast.error(data.error ?? "Failed to generate message");
        }
        return;
      }
      setQuoteForm((f) => ({
        ...f,
        message: data.message ?? f.message,
        timeline: data.timeline && !f.timeline ? data.timeline : f.timeline,
      }));
      toast.success("Message generated! Review before sending.");
    } catch {
      toast.error("Could not reach AI service.");
    } finally {
      setIsGeneratingQuoteMsg(false);
    }
  }

  function openQuoteModal(job: IJob) {
    setQuoteForm({ proposedAmount: "", timeline: "", message: "" });
    setQuoteModal({ open: true, job });
  }

  return (
    <>
    <div className="flex gap-6 items-start">
      {/* ── Left sidebar: filters ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-4 w-64 shrink-0 sticky top-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 space-y-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                <X className="h-3 w-3" />Clear
              </button>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keyword, location…"
                className="input pl-9 pr-8 text-sm w-full"
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
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Sort by</label>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="input pl-8 pr-8 text-sm appearance-none w-full cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Budget range */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Budget range (₱)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="Min"
                className="input text-sm w-full tabular-nums"
              />
              <span className="text-xs text-slate-300 flex-shrink-0">–</span>
              <input
                type="number"
                min="0"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="Max"
                className="input text-sm w-full tabular-nums"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Category</label>
            <div className="flex flex-col gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    category === c
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{c}</span>
                  {category === c && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right: content ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar: mobile filters inline + result count + refresh */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {isLoading ? (
              <span className="text-slate-300">Loading jobs…</span>
            ) : filtered.length === 0 ? (
              <>No jobs found{debouncedSearch && <> for &ldquo;<span className="font-medium text-slate-600">{debouncedSearch}</span>&rdquo;</>}{category !== "All" && <> in <span className="font-medium text-slate-600">{category}</span></>}</>
            ) : (
              <><span className="font-semibold text-slate-700">{filtered.length}</span> open job{filtered.length !== 1 ? "s" : ""}{category !== "All" && <> in <span className="font-medium text-slate-700">{category}</span></>}</>
            )}
          </p>
          <div className="flex items-center gap-2">
            {/* Mobile: inline search */}
            <div className="relative lg:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="input pl-9 text-sm w-40"
              />
            </div>
            <button
              onClick={() => fetchJobs(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

      {/* Result summary */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-slate-400">
          Showing{" "}
          <span className="font-semibold text-slate-600">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          {" "}of{" "}
          <span className="font-semibold text-slate-600">{filtered.length}</span>
          {" "}open job{filtered.length !== 1 ? "s" : ""}
          {debouncedSearch && <> matching <span className="font-medium text-slate-600">&ldquo;{debouncedSearch}&rdquo;</span></>}
        </p>
      )}

      {/* Jobs grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-4/5 rounded bg-slate-100" />
              <div className="flex gap-2 mt-1">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
          ))}
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
          {paginated.map((job) => {
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

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-xs text-slate-500 tabular-nums">
            Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      </div>{/* end right column */}
    </div>{/* end flex layout */}

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
            <div className="flex items-center justify-between mb-1">
              <label className="label">Message to Client</label>
              <button
                type="button"
                onClick={generateQuoteMessage}
                disabled={isGeneratingQuoteMsg}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGeneratingQuoteMsg ? "animate-pulse" : ""}`} />
                {isGeneratingQuoteMsg ? "Generating…" : "Generate with AI"}
              </button>
            </div>
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
    </>
  );
}
