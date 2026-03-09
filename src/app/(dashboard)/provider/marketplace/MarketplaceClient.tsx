"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  CheckCircle2,
  XCircle,
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
  Share2,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  MessageCircle,
  FileUp,
  FileText,
  Loader2,
} from "lucide-react";
import type { IJob } from "@/types";
import { apiFetch } from "@/lib/fetchClient";
import { PhotoStrip } from "@/components/shared/JobPhotoGallery";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const JOB_SHARE_BUTTONS = [
  {
    key: "fb",
    label: "Facebook",
    bg: "bg-[#1877f2]",
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.875v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>,
  },
  {
    key: "wa",
    label: "WhatsApp",
    bg: "bg-[#25d366]",
    href: (_url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
  },
  {
    key: "msg",
    label: "Messenger",
    bg: "bg-gradient-to-br from-[#0084ff] to-[#a334fa]",
    href: (url: string) => `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/></svg>,
  },
  {
    key: "tt",
    label: "TikTok",
    bg: "bg-[#010101] border border-slate-200",
    href: (url: string) => `https://www.tiktok.com/share?url=${encodeURIComponent(url)}`,
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>,
  },
];

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

interface QuoteForm {
  price: string;
  timeline: string;
  sitePhotos: string[];
  message: string;
}

interface ApplyForm {
  coverLetter: string;
  availability: string;
  resumeUrl: string;
  resumeName: string;
}

interface MarketplaceClientProps {
  initialJobs: IJob[];
  initialCategories: string[];
  initialQuotedJobStatuses: Record<string, string>;
  quoteCounts?: Record<string, number>;
  refJobId?: string;
}

const URGENCY_HOURS = 48;

export default function MarketplaceClient({
  initialJobs,
  initialCategories,
  initialQuotedJobStatuses,
  quoteCounts = {},
  refJobId,
}: MarketplaceClientProps) {
  const [jobs, setJobs] = useState<IJob[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; job: IJob | null }>({ open: false, job: null });
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({
    price: "", timeline: "", sitePhotos: [], message: "",
  });
  const [applyModal, setApplyModal] = useState<{ open: boolean; job: IJob | null }>({ open: false, job: null });
  const [applyForm, setApplyForm] = useState<ApplyForm>({ coverLetter: "", availability: "", resumeUrl: "", resumeName: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [quotedJobStatuses, setQuotedJobStatuses] = useState<Record<string, string>>(initialQuotedJobStatuses);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [categories] = useState<string[]>(initialCategories);
  const [isGeneratingQuoteMsg, setIsGeneratingQuoteMsg] = useState(false);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [shareJobId, setShareJobId] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search);

  // Load applied PESO/LGU job IDs on mount
  useEffect(() => {
    apiFetch("/api/apply")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.appliedJobIds)) {
          setAppliedJobIds(new Set<string>(d.appliedJobIds));
        }
      })
      .catch(() => {/* silent — provider may not have applications yet */});
  }, []);

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

    if (filterUrgent) {
      const cutoff = Date.now() + URGENCY_HOURS * 60 * 60 * 1000;
      list = list.filter((j) => j.scheduleDate && new Date(j.scheduleDate).getTime() <= cutoff);
    }

    if (filterVerified) {
      list = list.filter((j) => {
        const client = j.clientId as { isVerified?: boolean } | string;
        return typeof client === "object" && client.isVerified === true;
      });
    }

    list.sort((a, b) => {
      // Priority PESO jobs always float to the top
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      if (sort === "newest")      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest")      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "budget_desc") return b.budget - a.budget;
      if (sort === "budget_asc")  return a.budget - b.budget;
      return 0;
    });

    return list;
  }, [jobs, category, debouncedSearch, sort, minBudget, maxBudget, filterUrgent, filterVerified]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, category, sort, minBudget, maxBudget, filterUrgent, filterVerified]);

  // If a refJobId is provided (from /jobs/:id "Apply Now"), jump to that job
  const refHandled = useRef(false);
  useEffect(() => {
    if (!refJobId || refHandled.current || filtered.length === 0) return;
    const idx = filtered.findIndex((j) => j._id.toString() === refJobId);
    if (idx === -1) return;
    refHandled.current = true;
    const targetPage = Math.ceil((idx + 1) / PAGE_SIZE);
    setPage(targetPage);
    setExpandedId(refJobId);
    // Scroll after the next paint so the card is in the DOM
    requestAnimationFrame(() => {
      setTimeout(() => {
        document
          .querySelector(`[data-job-id="${refJobId}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    });
  }, [refJobId, filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = category !== "All" || search.trim() !== "" || minBudget !== "" || maxBudget !== "" || filterUrgent || filterVerified;

  function clearFilters() {
    setCategory("All");
    setSearch("");
    setMinBudget("");
    setMaxBudget("");
    setFilterUrgent(false);
    setFilterVerified(false);
    setPage(1);
    searchRef.current?.focus();
  }

  async function submitQuote() {
    if (!quoteModal.job) return;
    const total = parseFloat(quoteForm.price) || 0;
    if (total <= 0) { toast.error("Please enter a price"); return; }
    if (!quoteForm.timeline.trim()) { toast.error("Timeline is required"); return; }
    if (quoteForm.message.length < 20) { toast.error("Message must be at least 20 characters"); return; }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: quoteModal.job._id,
          proposedAmount: total,
          timeline: quoteForm.timeline,
          sitePhotos: quoteForm.sitePhotos,
          message: quoteForm.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "You have already submitted a quote for this job") {
          setQuotedJobStatuses((prev) => ({ ...prev, [quoteModal.job!._id.toString()]: "pending" }));
          setQuoteModal({ open: false, job: null });
          toast.error("You've already quoted this job");
        } else {
          toast.error(data.error ?? "Failed to submit quote");
        }
        return;
      }
      toast.success("Quote submitted!");
      setQuotedJobStatuses((prev) => ({ ...prev, [quoteModal.job!._id.toString()]: "pending" }));
      setQuoteModal({ open: false, job: null });
      setQuoteForm({ price: "", timeline: "", sitePhotos: [], message: "" });
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
    setQuoteForm({ price: "", timeline: "", sitePhotos: [], message: "" });
    setQuoteModal({ open: true, job });
  }

  function openApplyModal(job: IJob) {
    setApplyForm({ coverLetter: "", availability: "", resumeUrl: "", resumeName: "" });
    setApplyModal({ open: true, job });
  }

  async function submitApplication() {
    if (!applyModal.job) return;
    if (applyForm.coverLetter.length < 20) { toast.error("Cover letter must be at least 20 characters"); return; }
    if (!applyForm.availability.trim()) { toast.error("Please enter your availability"); return; }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: applyModal.job._id,
          coverLetter: applyForm.coverLetter,
          availability: applyForm.availability,
          ...(applyForm.resumeUrl ? { resumeUrl: applyForm.resumeUrl } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("already applied")) {
          setAppliedJobIds((prev) => new Set([...prev, applyModal.job!._id.toString()]));
          setApplyModal({ open: false, job: null });
          toast.error("You've already applied to this job");
        } else {
          toast.error(data.error ?? "Failed to submit application");
        }
        return;
      }
      toast.success("Application submitted!");
      setAppliedJobIds((prev) => new Set([...prev, applyModal.job!._id.toString()]));
      setApplyModal({ open: false, job: null });
      setApplyForm({ coverLetter: "", availability: "", resumeUrl: "", resumeName: "" });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
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

          {/* Quick toggles */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Quick filters</label>
            <button
              onClick={() => setFilterUrgent((v) => !v)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                filterUrgent
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Zap className="h-3.5 w-3.5 flex-shrink-0" />
              Urgent (within 48 h)
              {filterUrgent && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />}
            </button>
            <button
              onClick={() => setFilterVerified((v) => !v)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                filterVerified
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              Verified clients only
              {filterVerified && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
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
            {/* Mobile: filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen((o) => !o)}
              className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                mobileFiltersOpen || hasFilters
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
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

      {/* Mobile filter panel */}
      {mobileFiltersOpen && (
        <div className="lg:hidden bg-white rounded-xl border border-slate-200 shadow-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                <X className="h-3 w-3" />Clear all
              </button>
            )}
          </div>
          {/* Search */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keyword, location…"
                className="input pl-9 pr-8 text-sm w-full"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input pl-8 pr-8 text-sm appearance-none w-full cursor-pointer">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {/* Budget range */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Budget range (₱)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} placeholder="Min" className="input text-sm w-full tabular-nums" />
              <span className="text-xs text-slate-300 flex-shrink-0">–</span>
              <input type="number" min="0" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} placeholder="Max" className="input text-sm w-full tabular-nums" />
            </div>
          </div>
          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Category</label>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-0.5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex items-center justify-between text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    category === c ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50 border border-slate-100"
                  }`}
                >
                  <span className="truncate">{c}</span>
                  {category === c && <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
          {/* Quick toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterUrgent((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                filterUrgent ? "bg-amber-50 border-amber-300 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />Urgent
            </button>
            <button
              onClick={() => setFilterVerified((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                filterVerified ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />Verified clients
            </button>
          </div>
        </div>
      )}

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
            const isGovJob = job.jobSource === "peso" || job.jobSource === "lgu";
            const quoteStatus = !isGovJob ? quotedJobStatuses[id] as "pending" | "accepted" | "rejected" | undefined : undefined;
            const quoted = !isGovJob && !!quoteStatus;
            const applied = isGovJob && appliedJobIds.has(id);
            const expanded = expandedId === id;
            const isLong = job.description.length > 120;
            const isUrgent = job.scheduleDate &&
              new Date(job.scheduleDate).getTime() <= Date.now() + URGENCY_HOURS * 60 * 60 * 1000 &&
              new Date(job.scheduleDate).getTime() >= Date.now();
            const client = job.clientId as { isVerified?: boolean; name?: string } | string;
            const isVerifiedClient = typeof client === "object" && client.isVerified === true;
            const jobQuoteCount = quoteCounts[id] ?? 0;

            return (
              <div
                key={id}
                data-job-id={id}
                className={`bg-white rounded-xl border shadow-card flex flex-col transition-shadow hover:shadow-card-hover ${
                  refJobId === id
                    ? "border-blue-400 ring-2 ring-blue-300/60"
                    : applied
                    ? "border-sky-200"
                    : quoteStatus === "rejected"
                    ? "border-red-200"
                    : quoteStatus === "accepted"
                    ? "border-blue-200"
                    : quoted
                    ? "border-emerald-200"
                    : "border-slate-200"
                }`}
              >
                {/* Top strip */}
                <div className={`flex items-center justify-between px-5 py-3 border-b text-xs ${
                  applied
                    ? "border-sky-100 bg-sky-50/40"
                    : quoteStatus === "rejected"
                    ? "border-red-100 bg-red-50/40"
                    : quoteStatus === "accepted"
                    ? "border-blue-100 bg-blue-50/40"
                    : quoted
                    ? "border-emerald-100 bg-emerald-50/40"
                    : "border-slate-100 bg-slate-50/60"
                }`}>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 truncate">
                      <Briefcase className="h-3 w-3 flex-shrink-0" />
                      {job.category}
                    </span>
                    {isUrgent && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px] flex-shrink-0">
                        <Zap className="h-2.5 w-2.5" />Urgent
                      </span>
                    )}
                    {isVerifiedClient && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px] flex-shrink-0" title="Verified client">
                        <ShieldCheck className="h-2.5 w-2.5" />Verified
                      </span>
                    )}
                    {job.isPriority && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-[10px] flex-shrink-0">
                        ★ Priority
                      </span>
                    )}
                    {job.jobTags?.includes("peso") && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold text-[10px] flex-shrink-0">
                        🏛️ PESO
                      </span>
                    )}
                    {job.jobTags?.includes("lgu_project") && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-[10px] flex-shrink-0">
                        LGU
                      </span>
                    )}
                    {job.jobTags?.includes("emergency") && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-[10px] flex-shrink-0">
                        🚨 Emergency
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-slate-900 text-sm tabular-nums">{formatCurrency(job.budget)}</span>
                    <button
                      onClick={() => setShareJobId(shareJobId === id ? null : id)}
                      aria-label="Share job"
                      title="Share this job"
                      className={`p-1 rounded-md transition-all ${
                        shareJobId === id
                          ? "bg-blue-100 text-blue-600"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Share drawer */}
                {shareJobId === id && (() => {
                  const jobUrl = `${APP_URL}/jobs/${id}`;
                  const jobShareText = `📌 Job Available: ${job.title} in ${job.location} — ${formatCurrency(job.budget)}. Apply now on LocalPro!`;
                  return (
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-blue-50/60 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Share job:</p>
                      <div className="flex items-center gap-1.5">
                        {JOB_SHARE_BUTTONS.map((btn) => (
                          <a
                            key={btn.key}
                            href={btn.key === "wa" ? btn.href(jobUrl, jobShareText) : btn.href(jobUrl, jobShareText)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Share on ${btn.label}`}
                            className={`flex items-center justify-center w-7 h-7 rounded-lg hover:opacity-80 active:scale-95 transition-all ${btn.bg}`}
                          >
                            {btn.icon}
                          </a>
                        ))}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(jobUrl).then(() => {
                              setCopiedJobId(id);
                              setTimeout(() => setCopiedJobId(null), 2000);
                            });
                          }}
                          aria-label="Copy job link"
                          className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all active:scale-95 ${
                            copiedJobId === id
                              ? "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300"
                              : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                          }`}
                        >
                          {copiedJobId === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })()}

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
                    {jobQuoteCount > 0 && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        {jobQuoteCount} quote{jobQuoteCount !== 1 ? "s" : ""}
                      </span>
                    )}
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
                  <a
                    href={`/provider/messages?jobId=${id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary transition-colors"
                    title="Ask a question about this job"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Ask question
                  </a>
                  {applied ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-medium border border-sky-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Applied
                    </span>
                  ) : quoteStatus === "rejected" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-200">
                      <XCircle className="h-3.5 w-3.5" />
                      Quote Rejected
                    </span>
                  ) : quoteStatus === "accepted" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Quote Accepted
                    </span>
                  ) : quoted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Quote Sent
                    </span>
                  ) : (
                    <Button size="sm" onClick={() =>
                      isGovJob
                        ? openApplyModal(job)
                        : openQuoteModal(job)
                    }>
                      {isGovJob ? "Apply Now" : "Submit Quote"}
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

      {/* Apply Now modal — PESO / LGU jobs */}
      <Modal isOpen={applyModal.open} onClose={() => setApplyModal({ open: false, job: null })} title="Apply for Position">
        <div className="space-y-5">

          {/* Job summary */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Job Opening</p>
            <p className="text-sm font-semibold text-slate-900 leading-snug">{applyModal.job?.title}</p>
            {applyModal.job?.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />{applyModal.job.location}
              </p>
            )}
          </div>

          {/* Cover letter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs">Cover Letter <span className="text-red-400">*</span></label>
              <button
                type="button"
                onClick={async () => {
                  if (!applyModal.job) return;
                  setIsGeneratingQuoteMsg(true);
                  try {
                    const res = await apiFetch("/api/ai/generate-quote-message", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        jobTitle: applyModal.job.title,
                        jobDescription: applyModal.job.description,
                        jobBudget: applyModal.job.budget,
                        category: applyModal.job.category,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      if (data.upgradeRequired) {
                        toast(data.error ?? "AI features require Gold tier.", { icon: "🥇", style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }, duration: 5000 });
                      } else { toast.error(data.error ?? "Failed to generate message"); }
                      return;
                    }
                    setApplyForm((f) => ({ ...f, coverLetter: data.message ?? f.coverLetter }));
                    toast.success("Draft generated! Review before submitting.");
                  } catch { toast.error("Could not reach AI service."); }
                  finally { setIsGeneratingQuoteMsg(false); }
                }}
                disabled={isGeneratingQuoteMsg}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGeneratingQuoteMsg ? "animate-pulse" : ""}`} />
                {isGeneratingQuoteMsg ? "Generating…" : "AI Draft"}
              </button>
            </div>
            <textarea
              className="input w-full min-h-[110px] resize-none text-sm"
              placeholder="Introduce yourself, highlight your relevant experience, and explain why you are a good fit for this position…"
              value={applyForm.coverLetter}
              onChange={(e) => setApplyForm((f) => ({ ...f, coverLetter: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1 flex justify-between">
              <span>Min 20 characters</span>
              <span className={applyForm.coverLetter.length > 1000 ? "text-red-500" : ""}>{applyForm.coverLetter.length}/1000</span>
            </p>
          </div>

          {/* Availability */}
          <div>
            <label className="label block mb-1 text-xs">Availability <span className="text-red-400">*</span></label>
            <input
              className="input w-full text-sm"
              placeholder="e.g. Immediately, Starting April 1, Full-time Mon–Fri"
              value={applyForm.availability}
              onChange={(e) => setApplyForm((f) => ({ ...f, availability: e.target.value }))}
            />
          </div>

          {/* Resume upload */}
          <div>
            <label className="label block mb-1 text-xs">Resume / CV <span className="text-slate-400">(optional · PDF, max 10 MB)</span></label>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!resumeInputRef.current) resumeInputRef.current = e.target;
                e.target.value = "";
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) { toast.error("File exceeds 10 MB limit"); return; }
                setIsUploadingResume(true);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("folder", "resumes");
                  const res = await apiFetch("/api/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
                  setApplyForm((f) => ({ ...f, resumeUrl: data.url, resumeName: file.name }));
                  toast.success("Resume uploaded!");
                } catch { toast.error("Upload failed"); }
                finally { setIsUploadingResume(false); }
              }}
            />
            {applyForm.resumeUrl ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 font-medium truncate flex-1">{applyForm.resumeName}</span>
                <button
                  type="button"
                  onClick={() => setApplyForm((f) => ({ ...f, resumeUrl: "", resumeName: "" }))}
                  className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isUploadingResume}
                onClick={() => resumeInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50 text-xs font-medium"
              >
                {isUploadingResume
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                  : <><FileUp className="h-4 w-4" />Click to upload resume (PDF)</>}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setApplyModal({ open: false, job: null })}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={submitApplication}>Submit Application</Button>
          </div>
        </div>
      </Modal>

      {/* Quote Builder modal — private jobs only */}
      <Modal isOpen={quoteModal.open} onClose={() => setQuoteModal({ open: false, job: null })} title="Quote Builder">
        <div className="space-y-5">

          {/* Job summary */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Job</p>
            <p className="text-sm font-semibold text-slate-900 leading-snug">{quoteModal.job?.title}</p>
            <p className="text-xs text-slate-500">
              Client budget: <span className="font-semibold text-slate-700">{formatCurrency(quoteModal.job?.budget ?? 0)}</span>
            </p>
            {quoteModal.job?.beforePhoto && quoteModal.job.beforePhoto.length > 0 && (
              <div className="pt-1"><PhotoStrip urls={quoteModal.job.beforePhoto} label="Attachments" /></div>
            )}
          </div>

          {/* ── Pricing ── */}
          <div>
            <label className="label block mb-1 text-xs">Price <span className="text-red-400">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₱</span>
              <input
                type="number" min="0"
                className="input w-full pl-7 text-sm"
                placeholder="0"
                value={quoteForm.price}
                onChange={(e) => setQuoteForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            {(parseFloat(quoteForm.price) || 0) > 0 && (
              <div className="mt-2 flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500">Quote amount</span>
                <span className="text-sm font-bold text-primary tabular-nums">
                  {formatCurrency(parseFloat(quoteForm.price) || 0)}
                </span>
              </div>
            )}
          </div>

          {/* ── Timeline ── */}
          <div>
            <label className="label block mb-1 text-xs">Timeline <span className="text-red-400">*</span></label>
            <input
              className="input w-full text-sm"
              placeholder="e.g. 2–3 hours, 1 day, 3 days"
              value={quoteForm.timeline}
              onChange={(e) => setQuoteForm((f) => ({ ...f, timeline: e.target.value }))}
            />
          </div>





          {/* ── Message to client ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs">Message to Client <span className="text-red-400">*</span></label>
              <button
                type="button"
                onClick={generateQuoteMessage}
                disabled={isGeneratingQuoteMsg}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGeneratingQuoteMsg ? "animate-pulse" : ""}`} />
                {isGeneratingQuoteMsg ? "Generating…" : "AI Generate"}
              </button>
            </div>
            <textarea
              className="input w-full min-h-[90px] resize-none text-sm"
              placeholder="Introduce yourself and explain your approach…"
              value={quoteForm.message}
              onChange={(e) => setQuoteForm((f) => ({ ...f, message: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1 flex justify-between">
              <span>Min 20 characters</span>
              <span className={quoteForm.message.length > 1000 ? "text-red-500" : ""}>{quoteForm.message.length}/1000</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setQuoteModal({ open: false, job: null })}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={submitQuote}>Submit Quote</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
