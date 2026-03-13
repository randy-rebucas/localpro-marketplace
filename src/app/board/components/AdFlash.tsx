"use client";

/**
 * AdFlash — full-screen ad overlay that cycles through slides.
 *
 * Timing (all configurable via props):
 *   intervalMs  — how long to wait between ads   (default 2 min)
 *   displayMs   — how long each ad stays visible  (default 8 s)
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { APP_URL } from "../constants";

// ─── Shared ad types (exported so board API / types can reference them) ────────
export type AdTheme =
  | "blue" | "emerald" | "violet" | "amber" | "cyan"
  | "yellow" | "teal" | "indigo" | "rose" | "slate";

export interface ManagedAd {
  id: string;
  theme: AdTheme;
  eyebrow: string;
  headline: string;
  sub: string;
  cta?: string;
  url?: string;
}

/** Resolved slide ready for rendering (gradient / accent / border injected from theme) */
interface ResolvedAd extends ManagedAd {
  gradient: string;
  accent: string;
  border: string;
}

const THEME_PRESETS: Record<AdTheme, { gradient: string; accent: string; border: string }> = {
  blue:    { gradient: "from-blue-900 via-[#0d2340] to-[#1a3050]",    accent: "text-blue-300",    border: "border-blue-400/30" },
  emerald: { gradient: "from-emerald-900 via-[#0d2340] to-[#1a3050]", accent: "text-emerald-300", border: "border-emerald-400/30" },
  violet:  { gradient: "from-violet-900 via-[#0d2340] to-[#1a3050]",  accent: "text-violet-300",  border: "border-violet-400/30" },
  amber:   { gradient: "from-amber-900 via-[#0d2340] to-[#1a3050]",   accent: "text-amber-300",   border: "border-amber-400/30" },
  cyan:    { gradient: "from-cyan-900 via-[#0d2340] to-[#1a3050]",    accent: "text-cyan-300",    border: "border-cyan-400/30" },
  yellow:  { gradient: "from-yellow-900 via-[#0d2340] to-[#1a3050]",  accent: "text-yellow-300",  border: "border-yellow-400/30" },
  teal:    { gradient: "from-teal-900 via-[#0d2340] to-[#1a3050]",    accent: "text-teal-300",    border: "border-teal-400/30" },
  indigo:  { gradient: "from-indigo-900 via-[#0d2340] to-[#1a3050]",  accent: "text-indigo-300",  border: "border-indigo-400/30" },
  rose:    { gradient: "from-rose-900 via-[#0d2340] to-[#1a3050]",    accent: "text-rose-300",    border: "border-rose-400/30" },
  slate:   { gradient: "from-slate-800 via-[#0d2340] to-[#1a3050]",   accent: "text-slate-300",   border: "border-slate-400/30" },
};

function resolve(ad: ManagedAd): ResolvedAd {
  return { ...ad, ...(THEME_PRESETS[ad.theme] ?? THEME_PRESETS.blue) };
}

// ─── Default ad slides ─────────────────────────────────────────────────────────
const DEFAULT_ADS: ManagedAd[] = [
  { id: "provider-signup", theme: "blue",    eyebrow: "🚀  Join the Platform",       headline: "Become a Verified Provider",           sub: "Set your own rates. Get paid securely via escrow. Thousands of clients are waiting for skilled workers like you.",                                     cta: "Sign up free →",          url: `${APP_URL}/register?role=provider` },
  { id: "client-post",     theme: "emerald", eyebrow: "📋  Need Work Done?",         headline: "Post a Job in 60 Seconds",             sub: "Describe your task, set your budget, and get quotes from vetted local providers — no upfront cost, no hidden fees.",                                  cta: "Post a job →",            url: `${APP_URL}/client/post-job` },
  { id: "escrow",          theme: "violet",  eyebrow: "🔒  Safe & Secure",           headline: "Every Payment is Escrow-Protected",    sub: "Your money is held safely until the job is complete and you're satisfied. No more payment disputes or ghosted workers.",                                cta: "Learn more →",            url: `${APP_URL}/how-it-works` },
  { id: "ratings",         theme: "amber",   eyebrow: "⭐  Quality Guaranteed",      headline: "Hire Only Rated & Verified Providers", sub: "Every provider on LocalPro has verified identity, reviewed work history, and a public rating you can trust.",                                           cta: "Browse providers →",      url: `${APP_URL}/providers` },
  { id: "plumbing",        theme: "cyan",    eyebrow: "🔧  Plumbing Services",       headline: "Leaky Faucet? Clogged Drain?",         sub: "Find trusted plumbers in Ormoc City available today. Fixed-price quotes, no surprise charges, guaranteed workmanship.",                                 cta: "Find a plumber →",        url: `${APP_URL}/providers?category=Plumbing` },
  { id: "electrical",      theme: "yellow",  eyebrow: "⚡  Electrical Services",     headline: "Safe, Licensed Electricians Near You", sub: "Wiring, panel upgrades, outlets, and lighting — LocalPro electricians are PRC-licensed and background-checked.",                                       cta: "Book an electrician →",   url: `${APP_URL}/providers?category=Electrical` },
  { id: "cleaning",        theme: "teal",    eyebrow: "🧹  Cleaning Services",       headline: "Spotless Home, Stress-Free Life",      sub: "Professional deep cleaning, regular housekeeping, and move-in/move-out cleaning. Book in minutes, pay after.",                                          cta: "Book a cleaner →",        url: `${APP_URL}/providers?category=Cleaning` },
  { id: "peso-jobs",       theme: "indigo",  eyebrow: "🏛️  PESO Job Listings",      headline: "Government & LGU Jobs Available Now",  sub: "Browse PESO-posted employment opportunities, government programs, and LGU-funded livelihood projects in Ormoc City.",                                   cta: "View PESO jobs →",        url: `${APP_URL}/jobs?source=peso` },
  { id: "top-earners",     theme: "rose",    eyebrow: "💰  Top Provider Earnings",   headline: "Skilled Workers Earn ₱18,000+/Month", sub: "Our top-rated providers in Ormoc are earning more than minimum wage — on their own schedule, with zero boss.",                                            cta: "Start earning →",         url: `${APP_URL}/register?role=provider` },
  { id: "business",        theme: "slate",   eyebrow: "🏢  For Businesses",          headline: "Hire at Scale with a Business Account", sub: "Property managers, BPOs, and local businesses use LocalPro to manage recurring service jobs with one team dashboard.", cta: "Get a business account →", url: `${APP_URL}/register?role=client&plan=business` },
];

interface AdFlashProps {
  ads?: ManagedAd[];
  /** ms between ad appearances */
  intervalMs?: number;
  /** ms each ad stays on screen */
  displayMs?: number;
}

export function AdFlash({
  ads = DEFAULT_ADS,
  intervalMs = 120_000,
  displayMs  = 8_000,
}: AdFlashProps) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn]   = useState(false);
  const [idx, setIdx]         = useState(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (cycleTimer.current)   clearTimeout(cycleTimer.current);
  };

  function dismiss(nextIdx: number) {
    setFadeIn(false);
    dismissTimer.current = setTimeout(() => {
      setVisible(false);
      // schedule next ad after intervalMs
      cycleTimer.current = setTimeout(() => showAd(nextIdx), intervalMs);
    }, 600);
  }

  function showAd(adIdx: number) {
    setIdx(adIdx);
    setVisible(true);
    // slight delay so element mounts before fading in
    cycleTimer.current = setTimeout(() => setFadeIn(true), 50);
    // auto-dismiss after displayMs
    dismissTimer.current = setTimeout(() => dismiss((adIdx + 1) % ads.length), displayMs);
  }

  useEffect(() => {
    // show first ad after 10 s on first load, then intervalMs between subsequent ones
    cycleTimer.current = setTimeout(() => showAd(0), 10_000);
    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  const ad = resolve(ads[idx]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-500"
      style={{ opacity: fadeIn ? 1 : 0, backgroundColor: "rgba(10,20,35,0.80)" }}
      onClick={() => dismiss((idx + 1) % ads.length)}
    >
      <div
        className={`relative w-full max-w-2xl rounded-3xl border ${ad.border} bg-gradient-to-br ${ad.gradient} shadow-2xl p-8 md:p-12 text-center pointer-events-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss button */}
        <button
          onClick={() => dismiss((idx + 1) % ads.length)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          aria-label="Close ad"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Eyebrow */}
        <p className={`text-sm font-bold uppercase tracking-widest ${ad.accent} mb-3`}>
          {ad.eyebrow}
        </p>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
          {ad.headline}
        </h2>

        {/* Sub */}
        <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-lg mx-auto mb-6">
          {ad.sub}
        </p>

        {/* CTA */}
        {ad.cta && ad.url && (
          <a
            href={ad.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full border ${ad.border} bg-white/10 hover:bg-white/20 ${ad.accent} font-semibold text-sm transition-colors`}
          >
            {ad.cta}
          </a>
        )}

        {/* Progress bar */}
        <div className="mt-6 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${ad.accent.replace("text-", "bg-")}`}
            style={{ animation: `adprogress ${displayMs}ms linear forwards` }}
          />
        </div>

        <style>{`
          @keyframes adprogress {
            from { width: 100%; }
            to   { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}
