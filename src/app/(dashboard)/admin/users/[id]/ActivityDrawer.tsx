"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/fetchClient";
import { X, Activity, ExternalLink } from "lucide-react";
import Link from "next/link";

interface LogEntry {
  _id: string;
  eventType: string;
  jobId?: { _id: string; title: string; status?: string } | null;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
}

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

function formatEvent(e: string) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const EVENT_COLOR: Record<string, string> = {
  job_created:       "bg-blue-100 text-blue-700",
  job_approved:      "bg-emerald-100 text-emerald-700",
  job_rejected:      "bg-red-100 text-red-700",
  job_completed:     "bg-emerald-100 text-emerald-700",
  quote_submitted:   "bg-violet-100 text-violet-700",
  quote_accepted:    "bg-violet-100 text-violet-700",
  dispute_opened:    "bg-orange-100 text-orange-700",
  dispute_resolved:  "bg-slate-100 text-slate-600",
  escrow_funded:     "bg-cyan-100 text-cyan-700",
  escrow_released:   "bg-cyan-100 text-cyan-700",
  review_submitted:  "bg-yellow-100 text-yellow-700",
  payout_requested:  "bg-slate-100 text-slate-600",
  payout_updated:    "bg-slate-100 text-slate-600",
};

export default function ActivityDrawer({ userId, userName, onClose }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/activity?page=${p}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(1); }, [load]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Activity Log</p>
              <p className="text-xs text-slate-400">{userName} · {total} events</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              Loading…
            </div>
          )}
          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <Activity size={28} className="opacity-30" />
              No activity recorded for this user.
            </div>
          )}
          {!loading && logs.map((log) => {
            const color = EVENT_COLOR[log.eventType] ?? "bg-slate-100 text-slate-600";
            const date = new Date(log.createdAt).toLocaleString();
            const jobId = typeof log.jobId === "object" && log.jobId
              ? (log.jobId as { _id: string; title: string })
              : null;
            return (
              <div key={log._id} className="px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${color} mb-1`}>
                      {formatEvent(log.eventType)}
                    </span>
                    {jobId && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>Job:</span>
                        <Link
                          href={`/admin/jobs/${jobId._id}`}
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          {jobId.title}
                          <ExternalLink size={10} />
                        </Link>
                      </div>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 pt-0.5">{date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <button
                  onClick={() => load(page - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium transition-colors"
                >
                  Previous
                </button>
              )}
              {page < totalPages && (
                <button
                  onClick={() => load(page + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
