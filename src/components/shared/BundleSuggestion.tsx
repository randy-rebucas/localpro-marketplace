"use client";

import Link from "next/link";
import { getBundleSuggestions } from "@/lib/recommendations";
import { Sparkles } from "lucide-react";

interface Props {
  category: string;
}

export default function BundleSuggestion({ category }: Props) {
  const suggestions = getBundleSuggestions(category);
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-800">You may also need</h3>
        <span className="text-xs text-slate-400">— bundle related services</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {suggestions.map((s) => (
          <Link
            key={s.category}
            href={`/client/post-job?category=${encodeURIComponent(s.category)}`}
            className="flex-shrink-0 flex flex-col items-start gap-1 bg-slate-50 hover:bg-primary/5 border border-slate-200 hover:border-primary/30 rounded-xl p-3.5 min-w-[160px] max-w-[200px] transition-colors group"
          >
            <span className="text-2xl">{s.icon}</span>
            <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">
              {s.category}
            </span>
            <span className="text-xs text-slate-400 leading-snug">{s.reason}</span>
            <span className="text-xs font-medium text-primary mt-1">Post Job →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
