"use client";

import { Megaphone } from "lucide-react";
import { ANNOUNCEMENT_COLORS } from "../constants";
import type { BoardAnnouncement } from "../types";

export function AnnouncementTicker({ announcements }: { announcements: BoardAnnouncement[] }) {
  if (announcements.length === 0) return null;

  // Duplicate items for seamless marquee loop
  const items = [...announcements, ...announcements];

  return (
    <div className="flex items-center gap-0 h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 sm:px-4 bg-amber-500/20 border-r border-amber-500/30 h-full flex-shrink-0">
        <Megaphone className="h-4 w-4 text-amber-400" />
        <span className="hidden sm:inline text-xs font-bold text-amber-300 uppercase tracking-widest whitespace-nowrap">
          Announcements
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="flex items-center gap-0 animate-marquee whitespace-nowrap">
          {items.map((a, i) => (
            <span
              key={`${a._id}-${i}`}
              className={`inline-flex items-center gap-2 px-6 border-r border-white/10 text-sm ${
                ANNOUNCEMENT_COLORS[a.type] ?? "text-slate-300"
              }`}
            >
              {a.type === "success" && "🎉"}
              {a.type === "warning" && "⚠️"}
              {a.type === "info" && "📢"}
              {a.type === "danger" && "🚨"}
              <strong>{a.title}:</strong> {a.message}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
