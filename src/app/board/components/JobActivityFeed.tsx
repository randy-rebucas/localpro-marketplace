"use client";

import { useEffect, useState } from "react";
import { Megaphone, RefreshCw } from "lucide-react";
import { ACTIVITY_ICONS } from "../constants";
import type { ActivityFeedItem } from "../types";

export function JobActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchFeed() {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/public/activity-feed", { cache: "no-store" });
        if (!res.ok) throw new Error("Request failed");
        const data: ActivityFeedItem[] = await res.json();
        if (mounted) setItems(data);
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchFeed();
    const id = setInterval(fetchFeed, 12_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (loading && !items.length) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm px-2 py-2">
        <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
        Loading marketplace activity…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-300 text-xs px-2 py-2">
        <Megaphone className="h-4 w-4 text-red-400" />
        Could not load activity feed.
      </div>
    );
  }
  if (!items.length) return null;

  const latest = items.slice(0, 1);

  return (
    <div className="flex items-center gap-3 px-4 h-full">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Megaphone className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-widest whitespace-nowrap">Live Activity</span>
      </div>
      <div className="w-px h-5 bg-white/10 flex-shrink-0" />
      <div className="flex items-center gap-4 overflow-hidden">
        {latest.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm leading-none flex-shrink-0" aria-hidden="true">
              {item.icon || ACTIVITY_ICONS[item.id] || ACTIVITY_ICONS.default}
            </span>
            <span className="text-sm text-slate-300 truncate">{item.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
