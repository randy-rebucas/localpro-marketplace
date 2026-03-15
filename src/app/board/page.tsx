
"use client";

/**
 * /board — Public Service Job Display Board
 *
 * Designed for large-screen / kiosk / TV display.
 * Auto-refreshes every 60 seconds. Auto-paginates jobs every 12 seconds.
 * No authentication required.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin, Briefcase, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Wifi, WifiOff, RefreshCw, Trophy, Megaphone, Cpu,
} from "lucide-react";

import {
  CITY, APP_URL, PROVIDER_SIGNUP_URL,
  JOBS_PER_PAGE, JOB_PAGE_INTERVAL_MS, DATA_REFRESH_MS,
} from "./constants";
import type { BoardData } from "./types";

import { LiveClock } from "./components/LiveClock";
import { JobActivityFeed } from "./components/JobActivityFeed";
import { JobCard } from "./components/JobCard";
import { LeaderboardCard } from "./components/LeaderboardCard";
import { AnnouncementTicker } from "./components/AnnouncementTicker";
import { UrgentJobsStrip } from "./components/UrgentJobsStrip";
import { CategoryDemandWidget } from "./components/CategoryDemandWidget";
import { EstimatedEarningsWidget } from "./components/EstimatedEarningsWidget";
import { ProviderAchievementsWidget } from "./components/ProviderAchievementsWidget";
import { TrainingCTA } from "./components/TrainingCTA";
import { BottomStrip } from "./components/BottomStrip";
import { AchievementFeed } from "./components/AchievementFeed";
import { CompletionToast } from "./components/CompletionToast";
import { AdFlash } from "./components/AdFlash";

// ─── Main board ───────────────────────────────────────────────────────────────

export default function BoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [jobPage, setJobPage] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showBottomStrip, setShowBottomStrip] = useState(true);
  const [online, setOnline] = useState(true);
  const autoPageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomStripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotating provider QR motivational copy
  const QR_COPY_LINES = [
    `${data?.stats.openJobs ?? "Many"} jobs waiting for a provider right now`,
    "Top providers earn ₱18,000+ per month",
    "Free to sign up — start earning today",
    "KYC-verified. Trusted by Ormoc clients.",
    "Get paid securely via escrow — every time",
  ];
  const [qrCopyIdx, setQrCopyIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setQrCopyIdx((i) => (i + 1) % QR_COPY_LINES.length), 8_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [QR_COPY_LINES.length]);

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

  // Subscribe to server-sent settings changes so the board re-fetches immediately
  // when an admin toggles any feature flag or board setting.
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource("/api/public/board-settings");

      es.addEventListener("settings_changed", () => {
        fetchData();
      });

      es.onerror = () => {
        es?.close();
        es = null;
        // Reconnect after 5 s on error
        reconnectTimer = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [fetchData]);

  // Initial load + periodic refresh
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, DATA_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // Online / offline detection
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
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

  // Show strip for 10 s every 1 minute
  useEffect(() => {
    function scheduleShow() {
      bottomStripTimer.current = setTimeout(() => {
        setShowBottomStrip(true);
        bottomStripTimer.current = setTimeout(() => {
          setShowBottomStrip(false);
          scheduleShow();
        }, 10_000);
      }, 60_000);
    }
    setShowBottomStrip(false);
    scheduleShow();
    return () => {
      if (bottomStripTimer.current) clearTimeout(bottomStripTimer.current);
    };
  }, []);

  const totalJobPages = data ? Math.ceil(data.jobs.length / JOBS_PER_PAGE) : 0;
  const visibleJobs = data ? data.jobs.slice(jobPage * JOBS_PER_PAGE, (jobPage + 1) * JOBS_PER_PAGE) : [];

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
    <div className="flex flex-col min-h-screen md:h-screen overflow-x-hidden overflow-y-auto select-none bg-[#14243a] text-[15px] sm:text-base">
      <style>{`
        @keyframes fillbar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
      {/* ── Floating Info Strip — absolute overlay, hidden on mobile ── */}
      {data && (
        <div className="hidden md:flex flex-col absolute top-0 inset-x-0 z-20">
          {/* Slide down container */}
          <div
            className="overflow-hidden transition-all duration-1000 ease-in-out"
            style={{ maxHeight: showBottomStrip ? "600px" : "0px" }}
          >
            <div className="opacity-80 backdrop-blur-sm">
              <BottomStrip stats={data.stats} features={data.features} />
            </div>
          </div>
        </div>
      )}
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#1e3a5f] border-b border-white/10 px-3 sm:px-4 md:px-6 py-2 md:py-3 flex flex-row items-center justify-between gap-2 md:gap-4 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-xl font-extrabold text-white tracking-tight">LocalPro</span>
              <span className="text-[10px] sm:text-xs text-blue-300 font-medium">Marketplace</span>
            </div>
            <p className="hidden sm:block text-[11px] text-blue-200 uppercase tracking-widest font-semibold mt-0.5">
              Official Service Job Board
            </p>
          </div>
          <div className="h-8 w-px bg-white/20 hidden md:block" />
          <div className="hidden md:flex items-center gap-1.5 text-sm text-blue-200 font-medium">
            <MapPin className="h-4 w-4 text-blue-400" />
            {CITY}
          </div>
        </div>

        {/* LGU Partners */}
        <div className="hidden md:flex flex-col items-center gap-1 w-full md:w-auto">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LGU Partners</p>
          <div className="flex items-center gap-3">
            {/* Ormoc City */}
            <div className="flex flex-col items-center gap-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/official_seal_ormoc.png"
                alt="Ormoc City Official Seal"
                width={32}
                height={32}
                className="rounded-full object-contain"
              />
              <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap">Ormoc City</span>
            </div>
            {/* Be Our Partner placeholder */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 rounded-full border border-dashed border-slate-600 bg-white/5 flex items-center justify-center">
                <span className="text-slate-600 text-base leading-none">+</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-600 whitespace-nowrap">Be Our Partner</span>
            </div>
          </div>
        </div>

          {/* Clock + status */}
          <div className="flex items-center gap-1.5 md:gap-4 flex-shrink-0">
          {/* Online indicator */}
          <span
            className={`flex items-center gap-1 text-[11px] font-medium ${online ? "text-emerald-400" : "text-red-400"}`}
          >
            {online
              ? <Wifi className="h-3.5 w-3.5" />
              : <WifiOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{online ? "LIVE" : "OFFLINE"}</span>
          </span>
          {lastRefresh && (
            <span className="hidden md:block text-[11px] text-slate-400">
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
      <main className="flex-1 flex flex-col md:flex-row gap-0 md:min-h-0 md:overflow-hidden bg-gradient-to-b from-[#14243a] to-[#1a3050] relative">



        {/* ── Left Panel: Job Listings + side widgets ────────────────────── */}
        <section className="flex flex-1 min-w-0 border-b md:border-b-0 md:border-r border-white/10 md:overflow-hidden">

          {/* Jobs column */}
          <div className="flex flex-col flex-1 min-w-0 p-2 sm:p-3 md:p-4 gap-2 md:gap-3 md:overflow-y-auto">

            {/* Section header — title + inline activity feed + pagination */}
            <div className="flex items-center justify-between flex-shrink-0 gap-2 mb-1">
              {/* Title + count */}
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
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

              {/* Inline Live Activity feed */}
              {data?.features?.activityFeed && (
                <div className="flex-1 mx-3 h-8 bg-[#162d4a] border border-white/10 rounded-lg overflow-hidden hidden sm:block min-w-0">
                  <JobActivityFeed />
                </div>
              )}

              {/* Pagination controls */}
              {totalJobPages > 1 && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
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

            {/* Pagination progress bar — fills over JOB_PAGE_INTERVAL_MS, resets on page flip */}
            {totalJobPages > 1 && (
              <div className="flex-shrink-0 h-0.5 rounded-full bg-white/5 overflow-hidden -mt-1">
                <div
                  key={jobPage}
                  className="h-full bg-blue-400/60 rounded-full"
                  style={{ animation: `fillbar ${JOB_PAGE_INTERVAL_MS}ms linear forwards` }}
                />
              </div>
            )}

            {/* Job cards grid */}
            {data && visibleJobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 content-start md:flex-1 md:overflow-hidden">
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
                    className={`rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${i === jobPage ? "w-4 h-1.5 bg-blue-400" : "w-1.5 h-1.5 bg-white/20"
                      }`}
                    aria-label={`Go to jobs page ${i + 1}`}
                  />
                ))}
              </div>
            )}

          </div>{/* end jobs column */}

          {/* Right sidebar within left panel — hidden on mobile */}
          {(data?.features?.urgentJobs || data?.features?.categoryDemand) && (
            <div className="hidden md:flex flex-shrink-0 w-56 xl:w-64 flex-col gap-0 border-l border-white/10 overflow-hidden">
              {data.features.urgentJobs && (
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 border-b border-white/10">
                  <UrgentJobsStrip jobs={data.jobs} />
                </div>
              )}
              {data.features.categoryDemand && (
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
                  <CategoryDemandWidget className="w-full h-full rounded-2xl bg-[#0d2340]/90 backdrop-blur-sm border border-white/10 shadow-xl p-3 flex flex-col gap-2" />
                </div>
              )}
            </div>
          )}

        </section>

        {/* ── Right Panel: Leaderboard + QR + Earnings + Training — hidden on mobile ── */}
        <aside className="hidden md:flex w-full md:w-72 xl:w-80 flex-shrink-0 flex-col p-2 sm:p-3 md:p-4 gap-2 md:gap-3 border-t md:border-t-0 md:border-l-0 md:border-l border-white/10 overflow-y-auto bg-[#1e3a5f]/30 transition-all duration-200">

          {/* Leaderboard section */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 mb-1">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Provider Leaderboard
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1 flex-shrink-0 uppercase tracking-widest font-medium">
            Top 5 providers this platform
          </p>

          {/* Achievement feed */}
          {data?.leaderboard.length ? (
            <AchievementFeed entries={data.leaderboard} />
          ) : null}

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

          {/* Provider Achievements */}
          {data?.features?.achievementsWidget && data.leaderboard.length > 0 && (
            <ProviderAchievementsWidget
              entries={data.leaderboard}
              className="w-full flex-shrink-0 rounded-2xl bg-[#1a3050]/90 backdrop-blur-sm border border-amber-400/20 shadow-xl p-3 flex flex-col gap-2"
            />
          )}

          {/* Divider */}
          <div className="border-t border-white/10 my-1 flex-shrink-0" />

          {/* Provider Signup QR */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center text-center gap-2 rounded-2xl border border-blue-400/20 p-3 bg-gradient-to-b from-blue-900/40 to-[#0d2340]/80 relative overflow-hidden shadow-sm">
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
              <p className="text-xs text-blue-300 font-medium leading-relaxed transition-all duration-700 min-h-[2.5rem] flex items-center justify-center text-center px-1">
                {QR_COPY_LINES[qrCopyIdx]}
              </p>
            </div>

            {/* URL pill */}
            <div className="relative z-10 w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-mono tracking-tight break-all">
                {APP_URL}/register
              </p>
            </div>
          </div>

          {/* Earnings Calculator */}
          {data?.features?.earningsWidget && (
            <div className="flex-shrink-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">Earnings Calculator</p>
              <EstimatedEarningsWidget className="w-full rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 to-[#0d2340]/80 p-3" />
            </div>
          )}

          {/* Training CTA */}
          {data?.features?.trainingCta && <TrainingCTA />}

        </aside>

      </main>

      {/* Completion toast — bottom-right corner pop-up */}
      <CompletionToast />

      {/* Ad flash — full-screen overlay, cycles every 2 min, shows for 8 s */}
      {data?.features?.adsEnabled && (
        <AdFlash intervalMs={120_000} displayMs={8_000} ads={data?.ads ?? undefined} />
      )}

      {/* ── Footer: Announcement ticker ──────────────────────────────────── */}
      <footer className="flex-shrink-0 h-10 bg-[#1a3050] border-t border-white/10 overflow-hidden shadow-inner">
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
