"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { getNotificationLink } from "@/lib/notificationLinks";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { INotification } from "@/types";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  job_submitted: "📋",
  job_approved: "✅",
  job_rejected: "❌",
  quote_received: "📝",
  quote_accepted: "🎉",
  quote_rejected: "😔",
  escrow_funded: "💰",
  payment_confirmed: "✅",
  job_completed: "🏁",
  escrow_released: "💸",
  dispute_opened: "⚠️",
  dispute_resolved: "⚖️",
  review_received: "⭐",
  new_message: "💬",
  payment_failed: "🚫",
};

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
  const { notifications, unreadCount, hydrated, hydrate, connectSSE, disconnectSSE, markRead, markAllRead } =
    useNotificationStore();

  useEffect(() => {
    hydrate().then(() => connectSSE());
    return () => disconnectSSE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                {unreadCount} unread
              </span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">All your recent activity in one place.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-4">
            🔔
          </div>
          <p className="text-base font-medium text-slate-700">No notifications yet</p>
          <p className="text-sm text-slate-400 mt-1">
            You&apos;ll see updates about your jobs, quotes, and payments here.
          </p>
        </div>
      )}

      {/* Grouped list */}
      {groups.map((group) => (
        <section key={group.label}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {group.label}
          </p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100 overflow-hidden">
            {group.items.map((n) => {
              const isUnread = !n.readAt;
              const link = user?.role
                ? getNotificationLink(n.type, n.data, user.role)
                : null;

              return (
                <button
                  key={n._id?.toString()}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
                    isUnread ? "bg-blue-50/30" : ""
                  } ${link ? "cursor-pointer" : "cursor-default"}`}
                >
                  {/* Icon */}
                  <span className="text-2xl leading-none mt-0.5 flex-shrink-0">
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1.5" title={formatDate(n.createdAt)}>
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Right side: unread dot + chevron */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                    {isUnread && (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}
                    {link && <ChevronRight className="h-4 w-4 text-slate-300" />}
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
