import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { activityRepository } from "@/repositories/activity.repository";
import { formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  User,
  Briefcase,
  Code2,
  ChevronRight,
  Hash,
} from "lucide-react";
import { EventBadge, EVENT_CONFIG, RolePill } from "../page";

export const metadata: Metadata = { title: "Log Detail" };

// ── Mini log row used in sidebar panels ───────────────────────────────────────

function MiniLogRow({ log }: { log: Awaited<ReturnType<typeof activityRepository.findRelatedByJob>>[number] }) {
  const userObj = typeof log.userId === "object" && log.userId ? log.userId : null;
  return (
    <Link
      href={`/admin/logs/${String(log._id)}`}
      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <EventBadge type={log.eventType} />
        </div>
        {userObj && (
          <p className="text-[11px] text-slate-400 truncate">{userObj.name}</p>
        )}
        <p className="text-[10px] text-slate-300 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
          {formatRelativeTime(log.createdAt)}
        </p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminLogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const { id } = await params;
  const sp = await searchParams;

  const log = await activityRepository.findByIdWithRefs(id);
  if (!log) notFound();

  const userObj = typeof log.userId === "object" && log.userId ? log.userId : null;
  const jobObj  = typeof log.jobId  === "object" && log.jobId  ? log.jobId  : null;
  const metaEntries = log.metadata ? Object.entries(log.metadata) : [];

  const [relatedLogs, recentUserLogs] = await Promise.all([
    jobObj
      ? activityRepository.findRelatedByJob(String(jobObj._id), id)
      : Promise.resolve([]),
    userObj
      ? activityRepository.findRecentByUser(String(userObj._id), id)
      : Promise.resolve([]),
  ]);

  // Build back-link preserving filters from referrer (passed as query)
  const backHref = sp.event
    ? `/admin/logs?event=${sp.event}`
    : "/admin/logs";

  const cfg = EVENT_CONFIG[log.eventType];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Activity Logs
      </Link>

      {/* Event header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <EventBadge type={log.eventType} />
            <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded inline-flex items-center gap-1">
              <Hash className="h-2.5 w-2.5" />
              {String(log._id)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{cfg?.label ?? log.eventType}</h2>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span title={new Date(log.createdAt).toISOString()}>
                {new Date(log.createdAt).toLocaleString("en-PH", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="text-slate-300">·</span>
              <span className="italic">{formatRelativeTime(log.createdAt)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">User</h3>
          </div>
          {userObj ? (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {userObj.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{userObj.name}</p>
                  {userObj.email && (
                    <p className="text-[11px] text-slate-400">{userObj.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <RolePill role={userObj.role} />
                <Link
                  href={`/admin/users?search=${encodeURIComponent(userObj.name)}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  View user <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 font-mono">{String(log.userId)}</p>
            </div>
          )}
        </div>

        {/* Job card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job</h3>
          </div>
          {jobObj ? (
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 leading-snug">{jobObj.title}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {jobObj.status && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                    {jobObj.status}
                  </span>
                )}
                {jobObj.budget != null && (
                  <span className="text-[11px] font-semibold text-slate-700">
                    ₱{jobObj.budget.toLocaleString()}
                  </span>
                )}
              </div>
              <Link
                href={`/admin/jobs/${jobObj._id}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                View job <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="text-xs text-slate-300 italic">No job associated</p>
            </div>
          )}
        </div>
      </div>

      {/* Metadata card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Metadata</h3>
        </div>
        {metaEntries.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {metaEntries.map(([k, v]) => (
              <div key={k} className="flex items-start gap-4 px-5 py-3">
                <span className="text-[11px] font-semibold text-slate-500 min-w-[120px] pt-0.5">{k}</span>
                <pre className="text-xs text-slate-800 break-all whitespace-pre-wrap flex-1 font-mono">
                  {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-xs text-slate-300 italic">No metadata recorded for this event.</p>
        )}
      </div>

      {/* Related events on same job */}
      {relatedLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Other events on this job
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
              {relatedLogs.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {relatedLogs.map((r) => (
              <MiniLogRow key={String(r._id)} log={r} />
            ))}
          </div>
          {jobObj && (
            <div className="px-5 py-3 border-t border-slate-100">
              <Link
                href={`/admin/logs?job=${jobObj._id}`}
                className="text-xs text-primary hover:underline"
              >
                View all events for this job →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent activity by same user */}
      {recentUserLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Recent activity by {userObj?.name?.split(" ")[0] ?? "this user"}
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
              {recentUserLogs.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentUserLogs.map((r) => (
              <MiniLogRow key={String(r._id)} log={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
