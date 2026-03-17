"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ChevronRight, MapPin, ArrowRight, CalendarDays,
  AlertTriangle, ShieldAlert, Search, SlidersHorizontal, ListFilter, X,
} from "lucide-react";
import type { JobStatus, EscrowStatus } from "@/types";
import type { JobSortOption } from "@/repositories/job.repository";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SerializedAllJob {
  id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  scheduleDate: string | null;
  createdAt: string;
  clientName: string | null;
  providerName?: string | null;
}

export interface AdminAllJobsProps {
  jobs: SerializedAllJob[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  sort: JobSortOption;
  /** Active status filter (empty string = all). */
  status: string;
  /** Active search query. */
  q: string;
  /** Status → count map for the chip badges. */
  countMap: Record<string, number>;
  totalAll: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: JobStatus[] = [
  "pending_validation", "open", "assigned", "in_progress", "completed",
  "disputed", "refunded", "rejected", "expired", "cancelled",
];

const STATUS_LABELS: Record<JobStatus, string> = {
  pending_validation: "Pending",
  open:               "Open",
  assigned:           "Assigned",
  in_progress:        "In Progress",
  completed:          "Completed",
  disputed:           "Disputed",
  refunded:           "Refunded",
  rejected:           "Rejected",
  expired:            "Expired",
  cancelled:          "Cancelled",
};

const URGENT_STATUSES = new Set<JobStatus>(["disputed", "pending_validation"]);

const ACCENT_CLASS: Partial<Record<JobStatus, string>> = {
  disputed:           "border-l-4 border-l-red-400",
  pending_validation: "border-l-4 border-l-amber-400",
};

const SORT_OPTIONS: { value: JobSortOption; label: string }[] = [
  { value: "newest",      label: "Newest first" },
  { value: "oldest",      label: "Oldest first" },
  { value: "budget_desc", label: "Budget ↓" },
  { value: "budget_asc",  label: "Budget ↑" },
];

const LIMIT_OPTIONS = [20, 50, 100] as const;

// ─── Pagination helper ────────────────────────────────────────────────────────

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
  const pages: (number | "...")[] = [1];
  if (range[0] > 2) pages.push("...");
  pages.push(...range);
  if (range[range.length - 1] < total - 1) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAllJobsClient({
  jobs, total, page, totalPages, limit, sort, status, q, countMap, totalAll,
}: AdminAllJobsProps) {
  const router   = useRouter();
  const pathname = usePathname();

  // ── Search draft ────────────────────────────────────────────────────────
  const [searchDraft, setSearchDraft] = useState(q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync searchDraft when the server re-renders with a different q (e.g. after
  // clicking a status chip which resets the query)
  useEffect(() => { setSearchDraft(q); }, [q]);

  const buildUrl = useCallback(
    (overrides: Record<string, string | number | null | undefined>) => {
      const get = (key: string, fallback: string | number | null | undefined) =>
        key in overrides ? overrides[key] : fallback;

      const st  = get("status", status)  ?? "";
      const pg  = get("page",   1);
      const sq  = get("q",      searchDraft.trim()) ?? "";
      const sr  = get("sort",   sort);
      const lm  = get("limit",  limit);

      const sp = new URLSearchParams();
      if (st) sp.set("status", String(st));
      if (String(pg) !== "1") sp.set("page", String(pg));
      if (sq) sp.set("q", String(sq));
      if (sr && sr !== "newest") sp.set("sort", String(sr));
      if (lm && Number(lm) !== 20) sp.set("limit", String(lm));

      const str = sp.toString();
      return `${pathname}${str ? `?${str}` : ""}`;
    },
    [pathname, status, sort, limit, searchDraft],
  );

  const pushSearch = useCallback((val: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      router.push(buildUrl({ q: val.trim() || null, page: 1 }));
    }, 350);
  }, [buildUrl, router]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchDraft(e.target.value);
    pushSearch(e.target.value);
  }
  function clearSearch() { setSearchDraft(""); pushSearch(""); }

  const nDisputed = countMap["disputed"]          ?? 0;
  const nPending  = countMap["pending_validation"] ?? 0;
  const hasUrgent = nDisputed > 0 || nPending > 0;
  const isFiltered = !!status || !!searchDraft.trim();
  const pagination = pageNumbers(page, totalPages);

  return (
    <div className="space-y-5">

      {/* ── Urgent alert banner ───────────────────────────────────────────── */}
      {hasUrgent && !status && (
        <div className="flex flex-wrap items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Needs attention:</span>
          {nPending > 0 && (
            <button
              onClick={() => router.push(buildUrl({ status: "pending_validation", page: 1 }))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            >
              <ShieldAlert className="h-3 w-3" /> {nPending} pending validation
            </button>
          )}
          {nDisputed > 0 && (
            <button
              onClick={() => router.push(buildUrl({ status: "disputed", page: 1 }))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <AlertTriangle className="h-3 w-3" /> {nDisputed} disputed
            </button>
          )}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
            <ListFilter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">All Jobs</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {total.toLocaleString()} job{total !== 1 ? "s" : ""}
              {status ? ` · ${STATUS_LABELS[status as JobStatus] ?? status}` : ""}
              {q ? ` · "${q}"` : ""}
            </p>
          </div>
        </div>

        {/* Sort + per-page */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => router.push(buildUrl({ sort: opt.value, page: 1 }))}
                className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition-colors ${
                  sort === opt.value
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:bg-slate-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-600">
            {LIMIT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => router.push(buildUrl({ limit: n, page: 1 }))}
                className={`text-xs font-semibold px-2 py-1 rounded-xl transition-colors ${
                  limit === n
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {n}
              </button>
            ))}
            <span className="text-xs text-slate-400 dark:text-slate-500 pl-0.5">/ page</span>
          </div>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchDraft}
            onChange={handleSearchChange}
            placeholder="Search by job title…"
            className="input pl-8 pr-8 w-full text-sm h-9 rounded-xl dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          {searchDraft && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        {isFiltered && (
          <button
            onClick={() => { setSearchDraft(""); router.push(buildUrl({ status: null, q: null, page: 1 })); }}
            className="btn-secondary py-1.5 px-3 text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Status filter chips ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => router.push(buildUrl({ status: null, page: 1 }))}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            !status ? "bg-primary text-white border-primary" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          All
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            !status ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
          }`}>
            {totalAll.toLocaleString()}
          </span>
        </button>
        {ALL_STATUSES.map((s) => {
          const cnt = countMap[s] ?? 0;
          const isActive = status === s;
          const isUrgent = URGENT_STATUSES.has(s) && cnt > 0;
          return (
            <button
              key={s}
              onClick={() => router.push(buildUrl({ status: s, page: 1 }))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                isActive
                  ? "bg-primary text-white border-primary"
                  : isUrgent
                  ? "bg-white dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {STATUS_LABELS[s]}
              {cnt > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive   ? "bg-white/20 text-white"
                  : isUrgent ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Job list ──────────────────────────────────────────────────────── */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
            <Search className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No jobs match your filters.</p>
          <button
            onClick={() => { setSearchDraft(""); router.push(buildUrl({ status: null, q: null, page: 1 })); }}
            className="mt-3 inline-block text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/jobs/${job.id}`}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${
                URGENT_STATUSES.has(job.status) ? (ACCENT_CLASS[job.status] ?? "") : ""
              }`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p title={job.title} className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors text-sm truncate">
                  {job.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-2 py-0.5 font-medium">{job.category}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />{job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-300">
                      {job.clientName ?? <span className="italic text-slate-400">deleted user</span>}
                    </span>
                    {job.providerName && (
                      <>
                        <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300">{job.providerName}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <JobStatusBadge status={job.status} />
                  <EscrowBadge status={job.escrowStatus} />
                </div>
              </div>

              <div className="text-right flex-shrink-0 space-y-0.5 min-w-[90px]">
                <p className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(job.budget)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(job.createdAt)}</p>
                {job.scheduleDate && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1">
                    <CalendarDays className="h-3 w-3" />{formatDate(job.scheduleDate)}
                  </p>
                )}
              </div>

              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm flex-wrap gap-3">
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} jobs
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <button
                onClick={() => router.push(buildUrl({ page: page - 1 }))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                ← Prev
              </button>
            )}
            {pagination.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400 dark:text-slate-500 text-xs select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => router.push(buildUrl({ page: p }))}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            {page < totalPages && (
              <button
                onClick={() => router.push(buildUrl({ page: page + 1 }))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
