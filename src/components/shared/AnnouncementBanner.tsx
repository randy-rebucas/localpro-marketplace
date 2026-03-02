"use client";

import { useState, useEffect } from "react";
import { Info, AlertTriangle, CheckCircle2, XCircle, X } from "lucide-react";

interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
}

const STYLES: Record<
  Announcement["type"],
  { bar: string; icon: React.ElementType; iconClass: string }
> = {
  info:    { bar: "bg-blue-50 border-blue-200 text-blue-900",   icon: Info,          iconClass: "text-blue-500"  },
  warning: { bar: "bg-amber-50 border-amber-200 text-amber-900", icon: AlertTriangle, iconClass: "text-amber-500" },
  success: { bar: "bg-green-50 border-green-200 text-green-900", icon: CheckCircle2,  iconClass: "text-green-500" },
  danger:  { bar: "bg-red-50 border-red-200 text-red-900",       icon: XCircle,       iconClass: "text-red-500"   },
};

const STORAGE_KEY = "dismissed_announcements";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        const dismissed = getDismissed();
        setItems(
          (data.announcements ?? []).filter((a: Announcement) => !dismissed.includes(a._id))
        );
      })
      .catch(() => {});
  }, []);

  function dismiss(id: string) {
    const next = items.filter((a) => a._id !== id);
    setItems(next);
    saveDismissed([...getDismissed(), id]);
  }

  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((a) => {
        const { bar, icon: Icon, iconClass } = STYLES[a.type];
        return (
          <div
            key={a._id}
            className={`flex items-start gap-3 px-5 py-3 border-b text-sm ${bar}`}
          >
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{a.title}</span>
              {a.message && (
                <span className="ml-1.5 opacity-90">{a.message}</span>
              )}
            </div>
            <button
              onClick={() => dismiss(a._id)}
              aria-label="Dismiss"
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
