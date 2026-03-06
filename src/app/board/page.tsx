"use client";

/**
 * /board — Public Service Job Display Board
 *
 * Designed for large-screen / kiosk / TV display.
 * Auto-refreshes every 60 seconds. Auto-paginates jobs every 12 seconds.
 * No authentication required.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  MapPin, Briefcase, Star, Award, CheckCircle2, ChevronLeft, ChevronRight,
  Wifi, WifiOff, RefreshCw, CalendarDays, Trophy, Megaphone, Cpu,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoardJob {
  _id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
  scheduleDate: string;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  _id: string;
  name: string;
  avatar: string | null;
  completedJobCount: number;
  avgRating: number;
  completionRate: number;
  isLocalProCertified: boolean;
}

interface BoardAnnouncement {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
}

interface BoardData {
  jobs: BoardJob[];
  leaderboard: LeaderboardEntry[];
  announcements: BoardAnnouncement[];
  stats: { openJobs: number; completedJobs: number; topProviders: number };
  generatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CITY    = process.env.NEXT_PUBLIC_BOARD_CITY ?? "Your City";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";
const PROVIDER_SIGNUP_URL = `${APP_URL}/register?role=provider`;
const JOBS_PER_PAGE = 6;
const JOB_PAGE_INTERVAL_MS = 12_000;  // paginate jobs every 12s
const DATA_REFRESH_MS = 60_000;       // re-fetch board data every 60s

const ANNOUNCEMENT_COLORS: Record<string, string> = {
  info:    "border-sky-400 bg-sky-500/20 text-sky-200",
  success: "border-emerald-400 bg-emerald-500/20 text-emerald-200",
  warning: "border-amber-400 bg-amber-500/20 text-amber-200",
  danger:  "border-red-400 bg-red-500/20 text-red-200",
};

const RANK_MEDAL = ["🥇", "🥈", "🥉", "4.", "5."];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

function formatSchedule(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function qrUrl(jobId: string) {
  const target = `${APP_URL}/provider/marketplace?ref=${jobId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(target)}&format=png&color=0d2340&bgcolor=ffffff&margin=4`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right leading-tight">
      <p className="text-2xl font-bold tabular-nums tracking-tight">
        {now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-xs text-blue-300">
        {now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

function JobCard({ job }: { job: BoardJob }) {
  const [imgSrc, setImgSrc] = useState(() => qrUrl(job._id));

  return (
    <div className="bg-white/[0.07] border border-white/10 rounded-2xl p-4 flex gap-3 hover:bg-white/[0.10] transition-colors">
      {/* QR code */}
      <div className="flex-shrink-0 bg-white rounded-xl p-1.5 self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="Scan to apply"
          width={96}
          height={96}
          className="rounded-lg"
          onError={() => setImgSrc(`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(APP_URL)}&format=png`)}
        />
        <p className="text-[9px] text-slate-400 text-center mt-1 font-medium">SCAN TO APPLY</p>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        {/* Category badge */}
        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
          {job.category}
        </span>

        {/* Title */}
        <p className="text-sm font-bold text-white leading-snug line-clamp-2 mb-2">
          {job.title}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-slate-300 mb-1.5">
          <MapPin className="h-3 w-3 text-blue-400 flex-shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-1 text-xs text-slate-300 mb-3">
          <CalendarDays className="h-3 w-3 text-blue-400 flex-shrink-0" />
          <span>{formatSchedule(job.scheduleDate)}</span>
        </div>

        {/* Budget */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5">
          <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-300">{formatPeso(job.budget)}</span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      entry.rank === 1 ? "bg-amber-500/10 border border-amber-500/20" :
      entry.rank === 2 ? "bg-slate-400/10 border border-slate-400/20" :
      entry.rank === 3 ? "bg-orange-700/10 border border-orange-700/20" :
      "bg-white/[0.05] border border-white/[0.08]"
    }`}>
      {/* Rank medal */}
      <span className="text-2xl flex-shrink-0 w-8 text-center leading-none">
        {RANK_MEDAL[entry.rank - 1]}
      </span>

      {/* Avatar */}
      {entry.avatar ? (
        <Image
          src={entry.avatar}
          alt={entry.name}
          width={40}
          height={40}
          className="rounded-full object-cover flex-shrink-0 w-10 h-10 border-2 border-white/20"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm border-2 border-white/20">
          {entry.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-white truncate">{entry.name}</p>
          {entry.isLocalProCertified && (
            <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" aria-label="LocalPro Certified" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.avgRating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-amber-300">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {entry.avgRating.toFixed(1)}
            </span>
          )}
          <span className="text-xs text-slate-400">
            {entry.completedJobCount} jobs
          </span>
          {entry.completionRate > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {entry.completionRate}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementTicker({ announcements }: { announcements: BoardAnnouncement[] }) {
  if (announcements.length === 0) return null;

  // Duplicate items for seamless marquee loop
  const items = [...announcements, ...announcements];

  return (
    <div className="flex items-center gap-0 h-full overflow-hidden">
      {/* Label */}
      <div className="flex items-center gap-2 px-4 bg-amber-500/20 border-r border-amber-500/30 h-full flex-shrink-0">
        <Megaphone className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-widest whitespace-nowrap">
          Announcements
        </span>
      </div>

      {/* Scrolling text */}
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
              {a.type === "info"    && "📢"}
              {a.type === "danger"  && "🚨"}
              <strong>{a.title}:</strong> {a.message}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function BoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [jobPage, setJobPage] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const autoPageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/public/board", { cache: "no-store" });
      if (!res.ok) throw new Error("Request failed");
      const json: BoardData = await res.json();
      setData(json);
      setError(false);
      setLastRefresh(new Date());
      setOnline(true);
      setJobPage(0); // reset to first page on fresh data
    } catch {
      setError(true);
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + periodic refresh
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, DATA_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // Online / offline detection
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Auto-paginate jobs
  useEffect(() => {
    if (!data?.jobs.length) return;
    const totalPages = Math.ceil(data.jobs.length / JOBS_PER_PAGE);
    if (totalPages <= 1) return;
    if (autoPageTimer.current) clearInterval(autoPageTimer.current);
    autoPageTimer.current = setInterval(() => {
      setJobPage((p) => (p + 1) % totalPages);
    }, JOB_PAGE_INTERVAL_MS);
    return () => {
      if (autoPageTimer.current) clearInterval(autoPageTimer.current);
    };
  }, [data?.jobs.length]);

  const totalJobPages = data ? Math.ceil(data.jobs.length / JOBS_PER_PAGE) : 0;
  const visibleJobs   = data ? data.jobs.slice(jobPage * JOBS_PER_PAGE, (jobPage + 1) * JOBS_PER_PAGE) : [];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-4 text-slate-300">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-xl font-semibold">Loading board data…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen h-screen overflow-x-hidden overflow-y-auto select-none bg-[#14243a]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#1e3a5f] border-b border-white/10 px-4 md:px-6 py-2.5 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white tracking-tight">LocalPro</span>
              <span className="text-xs text-blue-300 font-medium">Marketplace</span>
            </div>
            <p className="text-[11px] text-blue-200 uppercase tracking-widest font-semibold mt-0.5">
              Official Service Job Board
            </p>
          </div>
          <div className="h-8 w-px bg-white/20 hidden md:block" />
          <div className="hidden md:flex items-center gap-1.5 text-sm text-blue-200 font-medium">
            <MapPin className="h-4 w-4 text-blue-400" />
            {CITY}
          </div>
        </div>

        {/* Stats strip */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 w-full md:w-auto justify-end">
          <StatPill label="Open Jobs" value={data?.stats.openJobs ?? 0} color="text-emerald-300" />
          <StatPill label="Completed" value={data?.stats.completedJobs ?? 0} color="text-blue-300" />
          <StatPill label="Top Providers" value={data?.stats.topProviders ?? 0} color="text-amber-300" />
        </div>

        {/* Clock + status */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 w-full md:w-auto justify-end">
          {/* Online indicator */}
          <span
            title={online ? "Live" : "Connection lost"}
            className={`flex items-center gap-1 text-[11px] font-medium ${online ? "text-emerald-400" : "text-red-400"}`}
          >
            {online
              ? <Wifi className="h-3.5 w-3.5" />
              : <WifiOff className="h-3.5 w-3.5" />}
            {online ? "LIVE" : "OFFLINE"}
          </span>
          {lastRefresh && (
            <span className="hidden sm:block text-[11px] text-slate-400">
              Updated {lastRefresh.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <LiveClock />
        </div>
      </header>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex-shrink-0 bg-red-800/50 border-b border-red-600 px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-sm text-red-200">Connection error — showing last known data.</p>
          <button
            onClick={() => fetchData()}
            className="text-xs text-red-300 underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col md:flex-row gap-0 min-h-0">

        {/* ── Left: Job listings ─────────────────────────────────────────── */}
        <section className="flex flex-col flex-1 min-w-0 border-b md:border-b-0 md:border-r border-white/10 p-2 sm:p-3 md:p-4 gap-2 md:gap-3 overflow-visible md:overflow-hidden">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between flex-shrink-0 gap-2">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Jobs Available
              </h2>
              {data && (
                <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  {data.stats.openJobs}
                </span>
              )}
            </div>

            {/* Pagination controls */}
            {totalJobPages > 1 && (
              <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                <button
                  onClick={() => setJobPage((p) => (p - 1 + totalJobPages) % totalJobPages)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Previous jobs page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-400">
                  {jobPage + 1} / {totalJobPages}
                </span>
                <button
                  onClick={() => setJobPage((p) => (p + 1) % totalJobPages)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Next jobs page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Job cards grid */}
          {data && visibleJobs.length > 0 ? (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 content-start overflow-hidden">
              {visibleJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-3 text-center min-h-[200px]">
              <Cpu className="h-10 w-10 md:h-12 md:w-12 text-slate-600" />
              <p className="text-slate-400 text-sm">No open jobs at the moment.</p>
              <p className="text-slate-500 text-xs">Check back soon — new jobs are posted regularly.</p>
            </div>
          )}

          {/* Page dots */}
          {totalJobPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-center gap-1 pt-1">
              {Array.from({ length: totalJobPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setJobPage(i)}
                  className={`rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    i === jobPage ? "w-4 h-1.5 bg-blue-400" : "w-1.5 h-1.5 bg-white/20"
                  }`}
                  aria-label={`Go to jobs page ${i + 1}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Right: Leaderboard ─────────────────────────────────────────── */}
        <aside className="w-full md:w-72 xl:w-80 flex-shrink-0 flex flex-col p-2 sm:p-3 md:p-4 gap-2 md:gap-3 border-t md:border-t-0 md:border-l-0 md:border-l border-white/10 overflow-visible md:overflow-hidden">

          {/* Leaderboard section */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Provider Leaderboard
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1 flex-shrink-0 uppercase tracking-widest font-medium">
            Top 5 providers this platform
          </p>

          <div className="flex flex-col gap-1.5 md:gap-2 flex-shrink-0">
            {data?.leaderboard.length ? (
              data.leaderboard.map((entry) => (
                <LeaderboardCard key={entry._id} entry={entry} />
              ))
            ) : (
              <div className="py-6 text-center text-slate-500 text-sm">
                No leaderboard data yet.
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-1 flex-shrink-0" />

          {/* Call-to-action QR */}
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 md:gap-4 rounded-2xl border border-blue-400/20 p-3 md:p-5 bg-gradient-to-b from-blue-900/40 to-[#0d2340]/80 relative overflow-hidden mt-2 md:mt-0">
            {/* subtle glow ring behind the QR */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-blue-500/10 blur-2xl" />
            </div>

            {/* Badge */}
            <span className="relative z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] md:text-[11px] font-bold text-blue-300 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Now Hiring
            </span>

            {/* QR frame */}
            <div className="relative z-10 bg-white rounded-2xl p-2 shadow-[0_0_24px_rgba(59,130,246,0.18)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(PROVIDER_SIGNUP_URL)}&format=png&color=0d2340&bgcolor=ffffff&margin=6`}
                alt="Scan to become a provider"
                width={110}
                height={110}
                className="rounded-xl block"
              />
            </div>

            {/* Text */}
            <div className="relative z-10 space-y-0.5 md:space-y-1">
              <p className="text-sm md:text-base font-extrabold text-white tracking-tight leading-snug">
                Become a Provider
              </p>
              <p className="text-xs text-blue-300 font-medium leading-relaxed">
                Scan the QR code to sign up<br />and start earning today
              </p>
            </div>

            {/* URL pill */}
            <div className="relative z-10 w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-mono tracking-tight break-all">
                {APP_URL}/register
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* ── Footer: Announcement ticker ──────────────────────────────────── */}
      <footer className="flex-shrink-0 h-10 bg-[#1a3050] border-t border-white/10 overflow-hidden">
        {data?.announcements.length ? (
          <AnnouncementTicker announcements={data.announcements} />
        ) : (
          <div className="flex items-center gap-2 px-6 h-full text-xs text-slate-500">
            <Megaphone className="h-3.5 w-3.5 text-slate-600" />
            No active announcements — check back later.
          </div>
        )}
      </footer>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold tabular-nums leading-none ${color}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  );
}
