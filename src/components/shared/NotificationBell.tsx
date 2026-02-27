"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore";
import { getNotificationLink } from "@/lib/notificationLinks";
import { formatRelativeTime } from "@/lib/utils";
import { NotifIcon } from "@/components/shared/notificationIcons";
import type { INotification } from "@/types";

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, unreadCount, hydrate, connectSSE, disconnectSSE, markRead, markAllRead } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Hydrate + connect SSE once on mount
  useEffect(() => {
    hydrate().then(() => connectSSE());
    return () => disconnectSSE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return;
    function onMouse(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleItemClick(n: INotification) {
    if (!n.readAt && n._id) markRead(n._id.toString());
    setOpen(false);
    if (user?.role) {
      const link = getNotificationLink(n.type, n.data, user.role);
      if (link) router.push(link);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 px-1.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <Bell className="h-6 w-6 text-slate-300" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const link = user?.role ? getNotificationLink(n.type, n.data, user.role) : null;
                return (
                  <button
                    key={n._id?.toString() ?? i}
                    onClick={() => handleItemClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      !n.readAt ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <NotifIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug truncate ${!n.readAt ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                      {!n.readAt && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                      {link && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
