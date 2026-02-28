"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";
import type { JobStatus } from "@/types";

interface ThreadPreview {
  jobId: string;
  title: string;
  status: JobStatus;
  unreadCount: number;
  lastBody: string | null;
  lastSender: string | null;
  lastAt: string | null;
}

interface Props {
  threads: ThreadPreview[];
  children: React.ReactNode;
}

export default function ProviderMessagesShell({ threads, children }: Props) {
  const pathname = usePathname();
  const activeJobId = pathname.split("/messages/")[1]?.split("/")[0] ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ── Left: thread list ─────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">Messages</h2>
        </div>

        {threads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 px-6 text-center">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <p className="text-xs">No conversations yet. Accept a job to start messaging with clients.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {threads.map((t) => {
              const isActive = t.jobId === activeJobId;
              const previewText = t.lastBody
                ? `${t.lastSender ? t.lastSender + ": " : ""}${t.lastBody}`
                : null;

              return (
                <li key={t.jobId}>
                  <Link
                    href={`/provider/messages/${t.jobId}`}
                    className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                      isActive
                        ? "bg-primary/5 border-l-2 border-primary"
                        : "hover:bg-slate-50 border-l-2 border-transparent"
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                      isActive ? "bg-primary/15" : "bg-slate-100"
                    }`}>
                      <MessageSquare className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-400"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm truncate font-medium ${isActive ? "text-primary" : "text-slate-800"}`}>
                          {t.title}
                        </p>
                        {t.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <JobStatusBadge status={t.status} />
                      </div>
                      {previewText ? (
                        <p className="text-xs text-slate-500 truncate">{previewText}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No messages yet</p>
                      )}
                      {t.lastAt && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatRelativeTime(new Date(t.lastAt))}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Right: chat panel ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
