"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface Category {
  name: string;
  slug: string;
  icon: string;
}

export default function ServiceSearch({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");
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
      router.push(`/jobs?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-3 gap-3 transition-shadow focus-within:shadow-xl focus-within:border-primary/40">
        <Search className="h-5 w-5 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="What service do you need?"
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
        />
        <button
          type="submit"
          className="btn-primary text-xs px-4 py-1.5 rounded-xl shrink-0"
        >
          Search
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1">
            {query.trim() ? "Matching services" : "Popular services"}
          </p>
          {filtered.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onMouseDown={() => handleSelect(cat.slug)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
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
