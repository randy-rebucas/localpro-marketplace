import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import type { JobSortOption } from "@/repositories/job.repository";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ChevronRight, MapPin, ArrowRight, CalendarDays,
  AlertTriangle, ShieldAlert, Search, SlidersHorizontal, ListFilter,
} from "lucide-react";
import type { JobStatus } from "@/types";

export const metadata: Metadata = { title: "All Jobs" };

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

const LIMIT_OPTIONS = [20, 50, 100];

export default async function AdminAllJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; sort?: string; limit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const { status, page: pageStr, q, sort: sortParam, limit: limitParam } = await searchParams;

  const page   = Math.max(1, parseInt(pageStr  ?? "1",  10));
  const limit  = LIMIT_OPTIONS.includes(parseInt(limitParam ?? "20", 10)) ? parseInt(limitParam!, 10) : 20;
  const sort   = (SORT_OPTIONS.map((s) => s.value) as string[]).includes(sortParam ?? "") ? (sortParam as JobSortOption) : "newest";

  const filter: Record<string, unknown> = {};
  if (status && ALL_STATUSES.includes(status as JobStatus)) filter.status = status;
  if (q?.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.title = { $regex: escaped, $options: "i" };
  }

  // Parallel: paginated results + global status counts
  const [result, statusCounts] = await Promise.all([
    jobRepository.findPaginated(filter as never, { page, limit, sort }),
    jobRepository.countByStatus(),
  ]);

  const countMap = Object.fromEntries(statusCounts.map((r) => [r._id, r.count]));
  const totalAll = Object.values(countMap).reduce((a, b) => a + b, 0);

  const jobs = result.data as unknown as {
    _id: { toString(): string };
    title: string;
    category: string;
    location: string;
    budget: number;
    status: JobStatus;
    escrowStatus: string;
    scheduleDate?: Date | null;
    createdAt: Date;
    clientId: { name: string; email: string };
    providerId?: { name: string; email: string } | null;
  }[];

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.status)                                     sp.set("status", params.status);
    if (params.page && params.page !== "1")                sp.set("page",   params.page);
    if (params.q)                                          sp.set("q",      params.q);
    if (params.sort && params.sort !== "newest")           sp.set("sort",   params.sort);
    if (params.limit && params.limit !== "20")             sp.set("limit",  params.limit);
    const str = sp.toString();
    return `/admin/all-jobs${str ? `?${str}` : ""}`;
  }

  // Numbered pagination window
  function pageNumbers(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
    const pages: (number | "...")[] = [1];
    if (range[0] > 2) pages.push("...");
    pages.push(...range);
    if (range[range.length - 1] < total - 1) pages.push("...");
    pages.push(total);
    return pages;
  }

  const nDisputed   = countMap["disputed"]           ?? 0;
  const nPending    = countMap["pending_validation"]  ?? 0;
  const hasUrgent   = nDisputed > 0 || nPending > 0;
  const isFiltered  = !!status || !!q?.trim();

  return (
    <div className="space-y-5">

      {/* ── Urgent alert banner ─────────────────────────────────────────────── */}
      {hasUrgent && !status && (
        <div className="flex flex-wrap items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Needs attention:</span>
          {nPending > 0 && (
            <Link
              href={buildUrl({ status: "pending_validation", sort, limit: String(limit) })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            >
              <ShieldAlert className="h-3 w-3" /> {nPending} pending validation
            </Link>
          )}
          {nDisputed > 0 && (
            <Link
              href={buildUrl({ status: "disputed", sort, limit: String(limit) })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <AlertTriangle className="h-3 w-3" /> {nDisputed} disputed
            </Link>
          )}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
            <ListFilter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">All Jobs</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {result.total.toLocaleString()} job{result.total !== 1 ? "s" : ""}
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
              <Link
                key={opt.value}
                href={buildUrl({ status, q, sort: opt.value, limit: String(limit), page: "1" })}
                className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition-colors ${
                  sort === opt.value
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:bg-slate-600"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-600">
            {LIMIT_OPTIONS.map((n) => (
              <Link
                key={n}
                href={buildUrl({ status, q, sort, limit: String(n), page: "1" })}
                className={`text-xs font-semibold px-2 py-1 rounded-xl transition-colors ${
                  limit === n
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {n}
              </Link>
            ))}
            <span className="text-xs text-slate-400 dark:text-slate-500 pl-0.5">/ page</span>
          </div>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <form method="GET" action="/admin/all-jobs" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
        {limit !== 20 && <input type="hidden" name="limit" value={String(limit)} />}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by job title…"
            className="input pl-8 w-full text-sm h-9 rounded-xl dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button type="submit" className="btn-primary py-1.5 px-4 text-sm">Search</button>
        {isFiltered && (
          <Link href="/admin/all-jobs" className="btn-secondary py-1.5 px-3 text-sm">Clear</Link>
        )}
      </form>

      {/* ── Status filter chips with counts ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildUrl({ q, sort, limit: String(limit) })}
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
        </Link>
        {ALL_STATUSES.map((s) => {
          const cnt = countMap[s] ?? 0;
          const isActive = status === s;
          const isUrgent = URGENT_STATUSES.has(s) && cnt > 0;
          return (
            <Link
              key={s}
              href={buildUrl({ status: s, q, sort, limit: String(limit) })}
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
            </Link>
          );
        })}
      </div>

      {/* ── Job list ────────────────────────────────────────────────────────── */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
            <Search className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No jobs match your filters.</p>
          <Link href="/admin/all-jobs" className="mt-3 inline-block text-xs text-primary hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
          {jobs.map((job) => (
            <Link
              key={job._id.toString()}
              href={`/admin/jobs/${job._id.toString()}`}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${
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
                    <span className="text-slate-600 dark:text-slate-300">{job.clientId.name}</span>
                    {job.providerId && (
                      <>
                        <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300">{job.providerId.name}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <JobStatusBadge status={job.status} />
                  <EscrowBadge status={job.escrowStatus as never} />
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

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm flex-wrap gap-3">
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, result.total)} of {result.total.toLocaleString()} jobs
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link href={buildUrl({ status, page: String(page - 1), q, sort, limit: String(limit) })} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                ← Prev
              </Link>
            )}
            {pageNumbers(page, result.totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400 dark:text-slate-500 text-xs select-none">…</span>
              ) : (
                <Link
                  key={p}
                  href={buildUrl({ status, page: String(p), q, sort, limit: String(limit) })}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {p}
                </Link>
              )
            )}
            {page < result.totalPages && (
              <Link href={buildUrl({ status, page: String(page + 1), q, sort, limit: String(limit) })} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
