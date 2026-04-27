import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { activityRepository } from "@/repositories/activity.repository";
import type { ActivityEventType } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { ScrollText, ChevronLeft, ChevronRight, Clock, ChevronRight as ArrowRight, Calendar, CalendarDays, Database } from "lucide-react";

export const metadata: Metadata = { title: "Activity Logs" };

// ── Event display config ───────────────────────────────────────────────────────

export const EVENT_CONFIG: Record<ActivityEventType, { label: string; color: string; dot: string }> = {
  // ── Job lifecycle ──────────────────────────────────────────────────────────
  job_created:      { label: "Job Created",       color: "bg-blue-100 text-blue-700 border-blue-200",           dot: "bg-blue-500" },
  job_approved:     { label: "Job Approved",      color: "bg-emerald-100 text-emerald-700 border-emerald-200",   dot: "bg-emerald-500" },
  job_rejected:     { label: "Job Rejected",      color: "bg-red-100 text-red-700 border-red-200",              dot: "bg-red-500" },
  job_started:      { label: "Job Started",       color: "bg-cyan-100 text-cyan-700 border-cyan-200",           dot: "bg-cyan-500" },
  job_completed:    { label: "Job Completed",     color: "bg-green-100 text-green-700 border-green-200",        dot: "bg-green-500" },
  job_expired:      { label: "Job Expired",       color: "bg-slate-100 text-slate-500 border-slate-200",        dot: "bg-slate-400" },
  job_cancelled:    { label: "Job Cancelled",     color: "bg-slate-100 text-slate-600 border-slate-200",        dot: "bg-slate-500" },
  job_reopened:     { label: "Job Reopened",      color: "bg-sky-100 text-sky-700 border-sky-200",              dot: "bg-sky-500" },
  // ── Quotes ────────────────────────────────────────────────────────────────
  quote_submitted:  { label: "Quote Submitted",   color: "bg-indigo-100 text-indigo-700 border-indigo-200",     dot: "bg-indigo-500" },
  quote_accepted:   { label: "Quote Accepted",    color: "bg-violet-100 text-violet-700 border-violet-200",     dot: "bg-violet-500" },
  quote_expired:    { label: "Quote Expired",     color: "bg-slate-100 text-slate-500 border-slate-200",        dot: "bg-slate-400" },
  quote_revised:    { label: "Quote Revised",     color: "bg-indigo-100 text-indigo-600 border-indigo-200",     dot: "bg-indigo-400" },
  // ── Escrow / Payments ─────────────────────────────────────────────────────
  escrow_funded:    { label: "Escrow Funded",     color: "bg-amber-100 text-amber-700 border-amber-200",        dot: "bg-amber-500" },
  escrow_released:  { label: "Escrow Released",   color: "bg-teal-100 text-teal-700 border-teal-200",           dot: "bg-teal-500" },
  provider_withdrew: { label: "Provider Withdrew", color: "bg-orange-100 text-orange-700 border-orange-200",    dot: "bg-orange-500" },
  payout_requested: { label: "Payout Requested",  color: "bg-purple-100 text-purple-700 border-purple-200",    dot: "bg-purple-500" },
  payout_updated:   { label: "Payout Updated",    color: "bg-pink-100 text-pink-700 border-pink-200",           dot: "bg-pink-500" },
  // ── Disputes ──────────────────────────────────────────────────────────────
  dispute_opened:   { label: "Dispute Opened",    color: "bg-red-100 text-red-700 border-red-200",              dot: "bg-red-500" },
  dispute_resolved: { label: "Dispute Resolved",  color: "bg-orange-100 text-orange-700 border-orange-200",     dot: "bg-orange-500" },
  // ── Reviews ───────────────────────────────────────────────────────────────
  review_submitted: { label: "Review Submitted",  color: "bg-yellow-100 text-yellow-700 border-yellow-200",     dot: "bg-yellow-500" },
  review_responded: { label: "Review Response",   color: "bg-yellow-100 text-yellow-600 border-yellow-200",     dot: "bg-yellow-400" },
  review_hidden:    { label: "Review Hidden",     color: "bg-slate-100 text-slate-600 border-slate-200",        dot: "bg-slate-500" },
  review_unhidden:  { label: "Review Restored",   color: "bg-slate-100 text-slate-500 border-slate-200",        dot: "bg-slate-400" },
  // ── Consultations ─────────────────────────────────────────────────────────
  consultation_requested:        { label: "Consultation Requested",    color: "bg-sky-100 text-sky-700 border-sky-200",            dot: "bg-sky-500" },
  consultation_accepted:         { label: "Consultation Accepted",     color: "bg-green-100 text-green-700 border-green-200",      dot: "bg-green-500" },
  consultation_declined:         { label: "Consultation Declined",     color: "bg-red-100 text-red-700 border-red-200",            dot: "bg-red-500" },
  consultation_converted_to_job: { label: "Converted to Job",          color: "bg-teal-100 text-teal-700 border-teal-200",         dot: "bg-teal-500" },
  consultation_stale_accepted:   { label: "Stale Accepted",            color: "bg-orange-100 text-orange-700 border-orange-200",   dot: "bg-orange-500" },
  // ── Recurring ─────────────────────────────────────────────────────────────
  recurring_created:     { label: "Recurring Created",     color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  recurring_cancelled:   { label: "Recurring Cancelled",   color: "bg-red-100 text-red-600 border-red-200",           dot: "bg-red-400" },
  recurring_job_spawned: { label: "Recurring Job Spawned", color: "bg-teal-100 text-teal-700 border-teal-200",         dot: "bg-teal-500" },
  // ── User / Auth ───────────────────────────────────────────────────────────
  user_registered:    { label: "User Registered",   color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  user_login:         { label: "Login",              color: "bg-blue-100 text-blue-600 border-blue-200",           dot: "bg-blue-400" },
  user_login_failed:  { label: "Login Failed",       color: "bg-red-100 text-red-600 border-red-200",              dot: "bg-red-400" },
  email_verified:     { label: "Email Verified",     color: "bg-emerald-100 text-emerald-600 border-emerald-200",  dot: "bg-emerald-400" },
  user_deleted:            { label: "User Deleted",          color: "bg-red-100 text-red-700 border-red-200",              dot: "bg-red-500" },
  user_deletion_requested: { label: "Deletion Requested",   color: "bg-rose-100 text-rose-700 border-rose-200",            dot: "bg-rose-500" },
  user_data_exported:      { label: "Data Exported",        color: "bg-slate-100 text-slate-600 border-slate-200",         dot: "bg-slate-400" },
  user_password_reset:     { label: "Password Reset",       color: "bg-amber-100 text-amber-700 border-amber-200",         dot: "bg-amber-500" },
  user_unlocked:           { label: "Account Unlocked",     color: "bg-emerald-100 text-emerald-700 border-emerald-200",   dot: "bg-emerald-500" },
  // ── Admin actions ─────────────────────────────────────────────────────────
  admin_ledger_entry:   { label: "Ledger Entry",        color: "bg-teal-100 text-teal-700 border-teal-200",          dot: "bg-teal-500" },
  admin_impersonation:  { label: "Admin Impersonation", color: "bg-rose-100 text-rose-700 border-rose-200",           dot: "bg-rose-500" },
  account_suspended:    { label: "Account Suspended",   color: "bg-red-100 text-red-700 border-red-200",              dot: "bg-red-500" },
  account_unsuspended:  { label: "Account Unsuspended", color: "bg-emerald-100 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  provider_approved:    { label: "Provider Approved",   color: "bg-emerald-100 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  provider_rejected:    { label: "Provider Rejected",   color: "bg-red-100 text-red-700 border-red-200",              dot: "bg-red-500" },
  role_changed:         { label: "Role Changed",        color: "bg-rose-100 text-rose-700 border-rose-200",           dot: "bg-rose-500" },
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_CONFIG) as ActivityEventType[];
const LIMIT = 50;

export function EventBadge({ type }: { type: ActivityEventType }) {
  const cfg = EVENT_CONFIG[type] ?? { label: type, color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin:    "bg-red-100 text-red-700",
    staff:    "bg-orange-100 text-orange-700",
    provider: "bg-violet-100 text-violet-700",
    client:   "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${map[role] ?? "bg-slate-100 text-slate-500"}`}>
      {role}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const params = await searchParams;
  const eventFilter = ALL_EVENT_TYPES.includes(params.event as ActivityEventType)
    ? (params.event as ActivityEventType)
    : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const [{ logs, total }, counts] = await Promise.all([
    activityRepository.findWithRefs({ eventType: eventFilter, page, limit: LIMIT }),
    activityRepository.countRecent(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);

  function pageUrl(p: number) {
    const q = new URLSearchParams();
    if (eventFilter) q.set("event", eventFilter);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/admin/logs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700">
          <ScrollText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Activity Logs</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit trail of every significant platform event
            {eventFilter ? ` · filtered by "${EVENT_CONFIG[eventFilter]?.label}"` : ""}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Calendar className="h-4 w-4" />, label: "Today",     value: counts.today.toLocaleString(), color: "text-primary" },
          { icon: <CalendarDays className="h-4 w-4" />, label: "Last 7 days", value: counts.week.toLocaleString(),  color: "text-violet-600" },
          { icon: <Database className="h-4 w-4" />, label: "All-time",  value: counts.total.toLocaleString(), color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-center gap-3">
            <div className={`${s.color} opacity-70`}>{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{s.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <form method="GET" action="/admin/logs" className="flex items-center gap-3 flex-wrap">
        <select
          name="event"
          defaultValue={eventFilter ?? ""}
          className="h-9 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="">All event types</option>
          {ALL_EVENT_TYPES.map((e) => (
            <option key={e} value={e}>{EVENT_CONFIG[e].label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
        {eventFilter && (
          <Link
            href="/admin/logs"
            className="h-9 px-3 inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:border-slate-300 transition-colors"
          >
            Clear ×
          </Link>
        )}
        {total > 0 && (
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {from}–{to} of {total.toLocaleString()}
          </span>
        )}
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
              <ScrollText className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">No activity logs found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{eventFilter ? "Try removing the event filter to see all logs." : "Platform events will appear here as they occur."}</p>
            {eventFilter && (
              <Link href="/admin/logs" className="mt-3 inline-block text-sm text-primary hover:underline">
                Clear filter
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/50">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 w-36">Time</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">User</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Event</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Job</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Details</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {logs.map((log) => {
                    const userObj = typeof log.userId === "object" && log.userId !== null ? log.userId : null;
                    const jobObj  = typeof log.jobId  === "object" && log.jobId  !== null ? log.jobId  : null;
                    const metaEntries = log.metadata ? Object.entries(log.metadata) : [];
                    return (
                      <tr
                        key={String(log._id)}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        {/* Time */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500"
                            title={new Date(log.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "medium" })}
                          >
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </td>

                        {/* User */}
                        <td className="px-5 py-3.5">
                          {userObj ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-primary">
                                  {userObj.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate max-w-[130px]">{userObj.name}</p>
                                <RolePill role={userObj.role} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{String(log.userId).slice(-8)}</span>
                          )}
                        </td>

                        {/* Event */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <EventBadge type={log.eventType} />
                        </td>

                        {/* Job */}
                        <td className="px-5 py-3.5 max-w-[180px]">
                          {jobObj ? (
                            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate block" title={jobObj.title}>
                              {jobObj.title}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Metadata */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {log.ipAddress && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded px-1.5 py-0.5 font-mono">
                                {log.ipAddress}
                              </span>
                            )}
                            {metaEntries.slice(0, log.ipAddress ? 2 : 3).map(([k, v]) => (
                              <span key={k} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5">
                                <span className="text-slate-400 dark:text-slate-500">{k}:</span>
                                <span className="font-medium">{String(v)}</span>
                              </span>
                            ))}
                            {metaEntries.length > (log.ipAddress ? 2 : 3) && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">+{metaEntries.length - (log.ipAddress ? 2 : 3)} more</span>
                            )}
                            {!log.ipAddress && metaEntries.length === 0 && (
                              <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </div>
                        </td>

                        {/* View detail arrow */}
                        <td className="pr-4 py-3.5 text-right">
                          <Link
                            href={`/admin/logs/${String(log._id)}`}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                            title="View detail"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {logs.map((log) => {
                const userObj = typeof log.userId === "object" && log.userId !== null ? log.userId : null;
                const jobObj  = typeof log.jobId  === "object" && log.jobId  !== null ? log.jobId  : null;
                const metaEntries = log.metadata ? Object.entries(log.metadata) : [];
                return (
                  <li key={String(log._id)}>
                    <Link href={`/admin/logs/${String(log._id)}`} className="block px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <EventBadge type={log.eventType} />
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(log.createdAt)}</span>
                      </div>
                      {userObj && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{userObj.name}</span>
                          <span className="ml-1.5 text-slate-400 dark:text-slate-500">({userObj.role})</span>
                        </p>
                      )}
                      {jobObj && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{jobObj.title}</p>
                      )}
                      {metaEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {metaEntries.slice(0, 3).map(([k, v]) => (
                            <span key={k} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5">
                              {k}: <strong>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} events
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageUrl(page - 1)} className="inline-flex items-center gap-1 h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 h-8 px-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-300 dark:text-slate-600 cursor-not-allowed">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </span>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageUrl(page + 1)} className="inline-flex items-center gap-1 h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 h-8 px-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-300 dark:text-slate-600 cursor-not-allowed">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
