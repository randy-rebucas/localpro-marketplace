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
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ── Left: thread list ─────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-200 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Support Inbox</h2>
          {totalUnread > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">
              {totalUnread}
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 px-6 text-center">
            <Headphones className="h-8 w-8 opacity-30" />
            <p className="text-xs">No support threads yet.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
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
                        ? "bg-primary/5 border-l-2 border-primary"
                        : "hover:bg-slate-50 border-l-2 border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                      isActive ? "bg-primary/15" : "bg-slate-100"
                    }`}>
                      <User className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-400"}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm truncate font-medium ${isActive ? "text-primary" : hasUnread ? "text-slate-900" : "text-slate-700"}`}>
                          {thread.user?.name ?? "Unknown User"}
                        </p>
                        {hasUnread && (
                          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
                            {thread.unreadForAdmin}
                          </span>
                        )}
                      </div>

                      {thread.user && (
                        <p className="text-[10px] text-slate-400 truncate mb-0.5">
                          {thread.user.email}
                          <span className="ml-1 capitalize text-slate-300">· {thread.user.role}</span>
                        </p>
                      )}

                      {preview ? (
                        <p className="text-xs text-slate-500 truncate">{preview}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No messages yet</p>
                      )}

                      {lastMsg?.createdAt && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
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
