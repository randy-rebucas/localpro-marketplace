"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Headphones, User } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export interface SupportThread {
  threadId: string;
  userId: string;
  lastMessage: {
    body?: string | null;
    createdAt?: string | null;
    senderId?: { name?: string } | string | null;
  } | null;
  unreadForAdmin: number;
  user: { _id: string; name: string; email: string; role: string } | null;
}

interface Props {
  threads: SupportThread[];
  children: React.ReactNode;
}

export default function AdminSupportShell({ threads, children }: Props) {
  const pathname = usePathname();
  const activeUserId = pathname.split("/support/")[1]?.split("/")[0] ?? null;

  const totalUnread = threads.reduce((s, t) => s + t.unreadForAdmin, 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      {/* ── Left: thread list ─────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Headphones className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Support Inbox</h2>
          </div>
          {totalUnread > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">
              {totalUnread}
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 px-6 text-center">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-700">
              <Headphones className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">No support threads yet.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {threads.map((thread) => {
              const isActive = thread.userId === activeUserId;
              const hasUnread = thread.unreadForAdmin > 0;
              const lastMsg = thread.lastMessage;
              const senderName =
                lastMsg?.senderId && typeof lastMsg.senderId === "object"
                  ? (lastMsg.senderId as { name?: string }).name ?? null
                  : null;
              const preview = lastMsg?.body
                ? `${senderName ? senderName + ": " : ""}${lastMsg.body}`
                : null;

              return (
                <li key={thread.threadId}>
                  <Link
                    href={`/admin/support/${thread.userId}`}
                    className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                      isActive
                        ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                      isActive ? "bg-primary/15" : "bg-slate-100 dark:bg-slate-700"
                    }`}>
                      <User className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm truncate font-semibold ${
                          isActive ? "text-primary" : hasUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                        }`}>
                          {thread.user?.name ?? "Unknown User"}
                        </p>
                        {hasUnread && (
                          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
                            {thread.unreadForAdmin}
                          </span>
                        )}
                      </div>

                      {thread.user && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mb-0.5">
                          {thread.user.email}
                          <span className="ml-1 capitalize text-slate-300 dark:text-slate-600">· {thread.user.role}</span>
                        </p>
                      )}

                      {preview ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{preview}</p>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No messages yet</p>
                      )}

                      {lastMsg?.createdAt && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatRelativeTime(new Date(lastMsg.createdAt))}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Right: chat panel ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
