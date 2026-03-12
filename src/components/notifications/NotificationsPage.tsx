"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, ChevronRight } from "lucide-react";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { getNotificationLink } from "@/lib/notificationLinks";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { NotifIcon } from "@/components/shared/notificationIcons";
import type { INotification } from "@/types";

// ─── Date grouping ─────────────────────────────────────────────────────────────

type Group = { label: string; items: INotification[] };

function groupByDate(notifications: INotification[]): Group[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Group[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, unreadCount, hydrated, hydrate, markRead, markAllRead } =
    useNotificationStore();

  // SSE is managed globally by NotificationBell (always mounted in the header).
  // We only need to hydrate existing notifications here.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const groups = groupByDate(notifications);

  async function handleClick(n: INotification) {
    if (!n.readAt && n._id) {
      await markRead(n._id.toString());
    }
    if (user?.role) {
      const link = getNotificationLink(n.type, n.data, user.role);
      if (link) router.push(link);
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Notifications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">All your recent activity in one place.</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex-shrink-0 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-16 flex flex-col items-center text-center">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-5">
            <Bell className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No notifications yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            You&apos;ll see updates about your jobs, quotes, and payments here.
          </p>
        </div>
      )}

      {/* Grouped list */}
      {groups.map((group) => (
        <section key={group.label}>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
            {group.label}
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
            {group.items.map((n) => {
              const isUnread = !n.readAt;
              const link = user?.role
                ? getNotificationLink(n.type, n.data, user.role)
                : null;

              return (
                <button
                  key={n._id?.toString() ?? String(n.createdAt)}
                  onClick={() => handleClick(n)}
                  className={`group w-full flex items-start gap-4 px-5 py-4 text-left transition-colors relative ${
                    isUnread
                      ? "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  } ${link ? "cursor-pointer" : "cursor-default"}`}
                >
                  {/* Unread left accent */}
                  {isUnread && (
                    <span className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-blue-400" />
                  )}
                  {/* Icon */}
                  <NotifIcon type={n.type} size="md" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        isUnread ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5" title={formatDate(n.createdAt)}>
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Right side: unread dot + chevron */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                    {isUnread && (
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                    {link && <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
