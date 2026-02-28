"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, User } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";

interface SupportUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface SupportThread {
  threadId: string;
  userId: string;
  lastMessage: Record<string, unknown>;
  unreadForAdmin: number;
  user: SupportUser | null;
}

export default function AdminSupportInboxPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/support")
      .then((r) => r.json())
      .then((data: SupportThread[]) => {
        setThreads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Real-time updates via SSE with auto-reconnect
  useEffect(() => {
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/admin/support/stream");
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as Record<string, unknown>;
          if (data.type === "connected") return;
          apiFetch("/api/admin/support")
            .then((r) => r.json())
            .then((updated: SupportThread[]) => setThreads(updated))
            .catch(() => {});
        } catch {}
      };
      es.onerror = () => {
        es.close();
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      es?.close();
      clearTimeout(retryTimer);
    };
  }, []);

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadForAdmin, 0);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Support Inbox</h1>
        {totalUnread > 0 && (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary text-white text-xs font-bold">
            {totalUnread} unread
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12 text-sm">Loading…</p>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Headphones className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No support threads yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {threads.map((thread) => {
            const lastMsg = thread.lastMessage;
            const hasUnread = thread.unreadForAdmin > 0;
            return (
              <li key={thread.threadId}>
                <Link
                  href={`/admin/support/${thread.userId}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${hasUnread ? "text-slate-900" : "text-slate-700"}`}>
                      {thread.user?.name ?? "Unknown User"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{thread.user?.email}</p>
                    {Boolean(lastMsg?.body) && (
                      <p className="text-sm text-slate-500 truncate mt-0.5">
                        {String(lastMsg.body)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {Boolean(lastMsg?.createdAt) && (
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(new Date(String(lastMsg.createdAt)))}
                      </span>
                    )}
                    {hasUnread && (
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-white text-xs font-bold">
                        {thread.unreadForAdmin}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
