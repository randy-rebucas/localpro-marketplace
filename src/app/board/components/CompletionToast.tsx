"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { formatPeso } from "../utils";

interface RecentCompletion {
  _id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
}

const TOAST_VISIBLE_MS = 5_000;
const POLL_INTERVAL_MS = 45_000;

export function CompletionToast() {
  const [queue, setQueue]     = useState<RecentCompletion[]>([]);
  const [current, setCurrent] = useState<RecentCompletion | null>(null);
  const [visible, setVisible] = useState(false);
  const [seen]                = useState(() => new Set<string>());

  // Poll for new completions every 45 s
  useEffect(() => {
    async function fetchCompletions() {
      try {
        const res = await fetch("/api/public/recent-completions", { cache: "no-store" });
        if (!res.ok) return;
        const data: RecentCompletion[] = await res.json();
        const newItems = data.filter((d) => !seen.has(d._id));
        if (!newItems.length) return;
        newItems.forEach((n) => seen.add(n._id));
        setQueue((q) => [...q, ...newItems]);
      } catch { /* fail silently */ }
    }
    fetchCompletions();
    const id = setInterval(fetchCompletions, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [seen]);

  // Dequeue one toast at a time
  useEffect(() => {
    if (visible || current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setVisible(true);
    const id = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrent(null), 500);
    }, TOAST_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [queue, visible, current]);

  if (!current) return null;

  return (
    <div
      className={`fixed bottom-16 right-4 z-50 w-72 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-[#0d1e2e] border border-emerald-500/40 rounded-2xl shadow-2xl p-3.5 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none mb-1">
            ✅ Job Completed
          </p>
          <p className="text-sm font-semibold text-white leading-snug line-clamp-1">
            {current.title}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {current.location} · <span className="text-emerald-300 font-bold">{formatPeso(current.budget)}</span>
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 mt-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full"
          style={{
            animation: `shrink ${TOAST_VISIBLE_MS}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
}
