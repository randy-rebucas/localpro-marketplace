"use client";

import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing:           "🔧",
  electrical:         "⚡",
  cleaning:           "🧹",
  carpentry:          "🪚",
  painting:           "🎨",
  roofing:            "🏠",
  hvac:               "❄️",
  landscaping:        "🌿",
  moving:             "📦",
  handyman:           "🛠️",
  masonry:            "🧱",
  welding:            "🔩",
  automotive:         "🚗",
  mechanical:         "⚙️",
  "it":               "💻",
  electronics:        "📡",
  food:               "🍳",
  tailoring:          "🪡",
  transportation:     "🚚",
  health:             "🏥",
  safety:             "🦺",
  beauty:             "💅",
  pet:                "🐾",
  default:            "🔔",
};

function categoryEmoji(cat: string): string {
  const key = cat.toLowerCase();
  return (
    Object.entries(CATEGORY_EMOJI).find(([k]) => key.includes(k))?.[1] ??
    CATEGORY_EMOJI.default
  );
}

interface CategoryDemandItem {
  category: string;
  count: number;
}

export function CategoryDemandWidget({ className }: { className?: string } = {}) {
  const [items, setItems] = useState<CategoryDemandItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchDemand() {
      try {
        const res = await fetch("/api/public/category-demand", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data: CategoryDemandItem[] = await res.json();
        if (mounted) setItems(data);
      } catch {
        // fail silently
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDemand();
    const id = setInterval(fetchDemand, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (loading || !items.length) return null;

  const max = items[0]?.count || 1;

  return (
    <div
      className={
        className ??
        "w-56 xl:w-64 self-end flex-shrink-0 rounded-2xl bg-[#0d2340]/90 backdrop-blur-sm border border-white/10 shadow-xl p-3 flex flex-col gap-2"
      }
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <BarChart2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-xs font-bold text-blue-300 uppercase tracking-widest leading-none">
          Most Requested Today
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.category} className="flex items-center gap-2">
            <span className="text-xs text-slate-300 w-24 truncate flex-shrink-0 capitalize">
              {categoryEmoji(item.category)} {item.category}
            </span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.round((item.count / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-blue-300 tabular-nums w-5 text-right flex-shrink-0">
              {item.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
