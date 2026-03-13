"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, RefreshCw, ChevronLeft, ChevronRight, Search, AlertCircle, Tag, SortAsc } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  _id: string;
  rating: number;
  feedback: string;
  createdAt: string;
  clientId: { _id: string; name: string; email: string; avatar?: string | null } | null;
  jobId:    { _id: string; title: string; category: string } | null;
  breakdown?: {
    quality?:         number;
    professionalism?: number;
    punctuality?:     number;
    communication?:   number;
  } | null;
}

interface Dimensions {
  quality:         number | null;
  professionalism: number | null;
  punctuality:     number | null;
  communication:   number | null;
}

interface Stats {
  avgRating:  number;
  totalCount: number;
  breakdown:  { star: number; count: number }[];
  dimensions: Dimensions;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
  stats: Stats;
}

type SortOption = "newest" | "highest" | "lowest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${sz} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`} />
      ))}
    </div>
  );
}

function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (avatar) return (
    <Image src={avatar} alt={name} width={36} height={36}
      className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100" />
  );
  return (
    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600 flex-shrink-0 ring-2 ring-slate-100">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",  label: "Newest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest",  label: "Lowest rated" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReviewsClient() {
  const [data, setData]             = useState<ReviewsResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(false);
  const [ratingFilter, setRating]   = useState<number | null>(null);
  const [sort, setSort]             = useState<SortOption>("newest");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (
    r = ratingFilter, p = page, s = sort, q = search,
  ) => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "12", sort: s });
      if (r != null) params.set("rating", String(r));
      if (q)         params.set("search", q);
      const res = await fetchClient<ReviewsResponse>(`/api/provider/agency/reviews?${params}`);
      setData(res);
    } catch {
      setLoadError(true);
      toast.error("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, page, sort, search]);

  useEffect(() => { load(); }, [load]);

  function handleRating(r: number | null) {
    setRating(r); setPage(1); load(r, 1, sort, search);
  }
  function handleSort(s: SortOption) {
    setSort(s); setPage(1); load(ratingFilter, 1, s, search);
  }
  function handlePage(p: number) {
    setPage(p); load(ratingFilter, p, sort, search);
  }
  function handleSearch(q: string) {
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(ratingFilter, 1, sort, q);
    }, 400);
  }

  const stats   = data?.stats;
  const reviews = data?.reviews ?? [];

  // ── Error screen ──
  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">Failed to load reviews</p>
        <button onClick={() => load()} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  // ── Skeleton ──
  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Reviews</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stats?.totalCount ?? 0} review{(stats?.totalCount ?? 0) !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => load()}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Rating Overview ── */}
      {stats && stats.totalCount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Big score */}
            <div className="flex flex-col items-center justify-center gap-1 min-w-[100px]">
              <span className="text-5xl font-bold text-slate-900">{stats.avgRating.toFixed(1)}</span>
              <Stars rating={Math.round(stats.avgRating)} size="lg" />
              <span className="text-xs text-slate-400">{stats.totalCount} review{stats.totalCount !== 1 ? "s" : ""}</span>
            </div>
            {/* Star breakdown bars */}
            <div className="flex-1 space-y-1.5">
              {stats.breakdown.map(({ star, count }) => {
                const pct = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handleRating(ratingFilter === star ? null : star)}
                      className={`flex items-center gap-1 w-16 text-right font-medium transition-colors ${ratingFilter === star ? "text-amber-500" : "text-slate-500 hover:text-amber-500"}`}
                    >
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" /> {star} stars
                    </button>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-slate-400 tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-dimension averages */}
          {Object.values(stats.dimensions).some((v) => v != null) && (
            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { key: "quality",         label: "Quality" },
                  { key: "professionalism", label: "Professionalism" },
                  { key: "punctuality",     label: "Punctuality" },
                  { key: "communication",   label: "Communication" },
                ] as { key: keyof Dimensions; label: string }[]
              ).map(({ key, label }) => {
                const val = stats.dimensions[key];
                return (
                  <div key={key} className="flex flex-col items-center gap-1 bg-slate-50 rounded-xl py-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                    {val != null ? (
                      <>
                        <span className="text-xl font-bold text-slate-800">{val.toFixed(1)}</span>
                        <Stars rating={Math.round(val)} />
                      </>
                    ) : (
                      <span className="text-sm text-slate-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Toolbar: search + sort + rating chips ── */}
      <div className="space-y-2.5">
        {/* Search + Sort row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search feedback…"
              className="input pl-8 py-1.5 text-sm w-full"
            />
          </div>
          <div className="relative flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 bg-white hover:bg-slate-50 cursor-pointer">
            <SortAsc className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value as SortOption)}
              className="appearance-none bg-transparent cursor-pointer focus:outline-none pr-1"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rating chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => handleRating(null)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${ratingFilter == null ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >All</button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button key={r} onClick={() => handleRating(r)}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${ratingFilter === r ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              <Star className="h-3.5 w-3.5 fill-current" /> {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reviews ── */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 gap-3 text-center px-6">
          <Star className="h-9 w-9 text-slate-300" />
          <p className="text-slate-600 font-medium">
            {ratingFilter || search
              ? "No reviews match your filters."
              : "No reviews yet"}
          </p>
          <p className="text-slate-400 text-sm max-w-xs">
            {ratingFilter || search
              ? "Try adjusting the filters above."
              : "Complete jobs and deliver great service to start receiving reviews from your clients."}
          </p>
          {(ratingFilter || search) ? (
            <button
              onClick={() => { handleRating(null); handleSearch(""); }}
              className="text-sm text-primary hover:underline"
            >Clear filters</button>
          ) : (
            <Link href="/provider/jobs" className="btn-primary text-sm px-4 py-2">Browse jobs</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar name={r.clientId?.name ?? "?"} avatar={r.clientId?.avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{r.clientId?.name ?? "Anonymous"}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Stars rating={r.rating} />
                    {r.rating === 5 && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                        Top rated
                      </span>
                    )}
                    {r.jobId && (
                      <span className="text-[11px] text-slate-400 truncate">· {r.jobId.title}</span>
                    )}
                  </div>
                  {r.jobId?.category && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      <Tag className="h-2.5 w-2.5" /> {r.jobId.category}
                    </span>
                  )}
                </div>
              </div>
              {r.feedback && (
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-4 py-3">
                  &ldquo;{r.feedback}&rdquo;
                </p>
              )}
              {r.breakdown && Object.values(r.breakdown).some((v) => v != null) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["quality", "professionalism", "punctuality", "communication"] as const).map((k) => {
                    const v = r.breakdown?.[k];
                    if (v == null) return null;
                    return (
                      <span key={k} className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full capitalize">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {k} {v}/5
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(data?.pages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {data?.page} of {data?.pages}</span>
          <div className="flex gap-1">
            <button onClick={() => handlePage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => handlePage(page + 1)} disabled={page >= (data?.pages ?? 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
