"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Briefcase, User, X, Loader2 } from "lucide-react";
import type { SearchResult } from "@/app/api/search/route";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const TYPE_ICON: Record<SearchResult["type"], React.ElementType> = {
  job: Briefcase,
  user: User,
  provider: User,
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data.results ?? []);
          setActiveIdx(0);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Reset on close
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIdx(0);
  }, []);

  // Global shortcut Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Scroll active result into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function navigate(result: SearchResult) {
    close();
    router.push(result.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIdx]) navigate(results[activeIdx]);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open search"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-400 leading-none">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              {loading ? (
                <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0" />
              ) : (
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="Search jobs, users…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={close}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1.5 py-0.5 border border-slate-200 rounded"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul ref={listRef} className="max-h-80 overflow-y-auto py-2">
                {results.map((r, i) => {
                  const Icon = TYPE_ICON[r.type];
                  return (
                    <li key={r._id}>
                      <button
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === activeIdx ? "bg-primary-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-slate-500" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-900 truncate">
                            {r.label}
                          </span>
                          {r.sublabel && (
                            <span className="block text-xs text-slate-500 truncate">
                              {r.sublabel}
                            </span>
                          )}
                        </span>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium capitalize">
                          {r.type}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Empty state */}
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No results for <span className="font-medium text-slate-600">"{query}"</span>
              </div>
            )}

            {/* Hint */}
            {query.length < 2 && (
              <div className="px-4 py-3 text-xs text-slate-400">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
