import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, MapPin, ArrowRight, CalendarDays } from "lucide-react";
import type { JobStatus } from "@/types";

export const metadata: Metadata = { title: "All Jobs" };

const ALL_STATUSES: JobStatus[] = [
  "pending_validation",
  "open",
  "assigned",
  "in_progress",
  "completed",
  "disputed",
  "refunded",
  "rejected",
  "expired",
  "cancelled",
];

const STATUS_LABELS: Record<JobStatus, string> = {
  pending_validation: "Pending",
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  disputed: "Disputed",
  refunded: "Refunded",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export default async function AdminAllJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const { status, page: pageStr, q } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const limit = 20;

  const filter: Record<string, unknown> = {};
  if (status && ALL_STATUSES.includes(status as JobStatus)) {
    filter.status = status;
  }
  if (q?.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.title = { $regex: escaped, $options: "i" };
  }

  const result = await jobRepository.findPaginated(filter as never, { page, limit });

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

  // Left-border accent for statuses that need attention
  const urgentStatuses = new Set<JobStatus>(["disputed", "pending_validation"]);
  const accentClass: Partial<Record<JobStatus, string>> = {
    disputed: "border-l-4 border-l-red-400",
    pending_validation: "border-l-4 border-l-amber-400",
  };

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.page && params.page !== "1") sp.set("page", params.page);
    if (params.q) sp.set("q", params.q);
    const str = sp.toString();
    return `/admin/all-jobs${str ? `?${str}` : ""}`;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">All Jobs</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {result.total.toLocaleString()} job{result.total !== 1 ? "s" : ""}
          {status ? ` · filtered by "${STATUS_LABELS[status as JobStatus] ?? status}"` : ""}
          {q ? ` · "${q}"` : ""}
        </p>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/all-jobs" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title…"
          className="input flex-1 max-w-sm text-sm py-1.5"
        />
        <button type="submit" className="btn-primary py-1.5 px-4 text-sm">
          Search
        </button>
        {(q || status) && (
          <Link href="/admin/all-jobs" className="btn-secondary py-1.5 px-3 text-sm">
            Clear
          </Link>
        )}
      </form>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildUrl({ q })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !status
              ? "bg-primary text-white border-primary"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s, q })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              status === s
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <p className="text-slate-400 text-sm">No jobs match your filters.</p>
          <Link href="/admin/all-jobs" className="mt-3 inline-block text-xs text-primary hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden divide-y divide-slate-100">
          {jobs.map((job) => (
            <Link
              key={job._id.toString()}
              href={`/admin/jobs/${job._id.toString()}`}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group ${
                urgentStatuses.has(job.status) ? (accentClass[job.status] ?? "") : ""
              }`}
            >
              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-1">
                <p
                  title={job.title}
                  className="font-semibold text-slate-900 group-hover:text-primary transition-colors text-sm truncate"
                >
                  {job.title}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                    {job.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {job.location}
                  </span>
                  {/* Client → Provider */}
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-600">{job.clientId.name}</span>
                    {job.providerId && (
                      <>
                        <ArrowRight className="h-3 w-3 text-slate-300 flex-shrink-0" />
                        <span className="text-slate-600">{job.providerId.name}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <JobStatusBadge status={job.status} />
                  <EscrowBadge status={job.escrowStatus as never} />
                </div>
              </div>

              {/* Right: budget + dates */}
              <div className="text-right flex-shrink-0 space-y-0.5 min-w-[90px]">
                <p className="font-bold text-slate-900 text-sm">{formatCurrency(job.budget)}</p>
                <p className="text-xs text-slate-400">{formatDate(job.createdAt)}</p>
                {job.scheduleDate && (
                  <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(job.scheduleDate)}
                  </p>
                )}
              </div>

              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">
            Page {result.page} of {result.totalPages}
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={buildUrl({ status, page: String(result.page - 1), q })}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                ← Previous
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={buildUrl({ status, page: String(result.page + 1), q })}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
