"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import { useVisitorLocation } from "@/hooks/useVisitorLocation";

interface Category {
  name: string;
  slug: string;
  icon: string;
}

export default function HeroSearchBar({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");
  const { label: location, setLocation } = useVisitorLocation();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : categories.slice(0, 6);

  function handleSelect(slug: string) {
    setOpen(false);
    router.push(`/register?role=client&category=${slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (filtered.length > 0) {
      handleSelect(filtered[0].slug);
    } else if (query.trim()) {
      const q = encodeURIComponent(query.trim());
      const loc = location.trim() ? `&location=${encodeURIComponent(location.trim())}` : "";
      router.push(`/jobs?q=${q}${loc}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl xl:max-w-[44rem] 2xl:max-w-[48rem]">
      <div className="flex flex-col sm:flex-row sm:items-stretch rounded-2xl bg-white shadow-[0_12px_48px_rgba(10,37,64,0.12)] ring-1 ring-slate-200/90 overflow-hidden">
        <div className="relative flex-1 flex items-center gap-3 px-4 sm:px-5 py-3.5 min-h-[52px] border-b sm:border-b-0 sm:border-r border-slate-100">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="What service do you need?"
            className="flex-1 min-w-0 bg-transparent text-sm text-[#0c2c50] placeholder:text-slate-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:w-[min(240px,34%)] shrink-0 border-b sm:border-b-0 border-slate-100 min-h-[52px]">
          <MapPin className="h-5 w-5 text-brand shrink-0" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Manila, PH"
            className="w-full bg-transparent text-sm text-[#0c2c50] placeholder:text-slate-400 outline-none"
            aria-label="Location"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center bg-brand hover:bg-brand-600 text-white text-sm font-semibold px-8 sm:px-10 py-3.5 sm:py-0 sm:min-w-[9.5rem] transition-colors shrink-0 min-h-[48px] sm:min-h-0 sm:self-stretch"
        >
          Search
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-lg bg-white shadow-xl border border-slate-200 overflow-hidden z-20">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1">
            {query.trim() ? "Matching services" : "Popular services"}
          </p>
          {filtered.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onMouseDown={() => handleSelect(cat.slug)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="text-lg">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
