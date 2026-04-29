"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Clock,
  FileText,
  Headphones,
  Home,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Smartphone,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

function SkylineDecoration() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[min(42vh,320px)] overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute bottom-0 left-1/2 w-[min(140%,1200px)] -translate-x-1/2 text-slate-200/90"
        viewBox="0 0 900 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M0 140V96h52V72h36v24h44V52h48v40h56V68h40v-28h36v28h52v-20h44v20h48V64h40v76H0z"
        />
        <circle cx="120" cy="48" r="10" fill="currentColor" className="text-emerald-100/80" />
        <circle cx="680" cy="40" r="14" fill="currentColor" className="text-emerald-50" />
      </svg>
    </div>
  );
}

function OfflineHeroIllustration() {
  return (
    <div className="relative mx-auto flex min-h-[200px] w-full max-w-md items-end justify-center sm:min-h-[240px]">
      <SkylineDecoration />
      <div className="relative z-10 flex flex-col items-center pb-1 pt-10">
        <div className="relative">
          <div className="absolute -top-8 left-1/2 z-20 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-red-100">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <WifiOff className="h-5 w-5 text-red-600" strokeWidth={2.25} />
            </div>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-b from-brand-100 to-brand-50 shadow-card ring-4 ring-white sm:h-36 sm:w-36">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0a2540] text-white shadow-inner">
                <UserRound className="h-8 w-8 opacity-95" strokeWidth={1.75} />
              </div>
              <div className="-mt-1 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm ring-1 ring-slate-200/80">
                <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500">…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OfflinePage() {
  useEffect(() => {
    const tryReload = () => {
      window.location.reload();
    };
    window.addEventListener("online", tryReload);
    const interval = window.setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) tryReload();
    }, 4000);
    return () => {
      window.removeEventListener("online", tryReload);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <main className="relative flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-white to-white" aria-hidden />

          <div className="relative mx-auto max-w-site px-4 pb-10 pt-6 text-center sm:px-6 sm:pb-14 sm:pt-8">
            <OfflineHeroIllustration />

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-[#0a2540]">You&apos;re </span>
              <span className="text-brand-600">Offline</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              It looks like you&apos;ve lost your internet connection. Please check your connection and try again.
            </p>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-brand-500" aria-hidden />

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0a2540]/20 bg-white px-6 py-3 text-sm font-bold text-[#0a2540] transition hover:border-[#0a2540]/35 hover:bg-slate-50 sm:w-auto"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Link>
            </div>

            <p className="mt-8 text-sm text-slate-600">
              Need help?{" "}
              <Link href="/support" className="font-bold text-brand-600 hover:text-brand-700">
                Contact Support
              </Link>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-site px-4 pb-6 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
            <h2 className="text-center text-lg font-extrabold text-[#0a2540] sm:text-xl">
              While you&apos;re offline, you can still:
            </h2>
            <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-card ring-1 ring-slate-200/80">
                  <Bookmark className="h-6 w-6" strokeWidth={2} />
                </div>
                <p className="text-sm font-bold text-[#0a2540]">View Saved Items</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Access your saved providers and jobs.
                </p>
              </li>
              <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-card ring-1 ring-slate-200/80">
                  <Clock className="h-6 w-6" strokeWidth={2} />
                </div>
                <p className="text-sm font-bold text-[#0a2540]">Check Recent Activity</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  See your recent bookings and job applications.
                </p>
              </li>
              <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-card ring-1 ring-slate-200/80">
                  <FileText className="h-6 w-6" strokeWidth={2} />
                </div>
                <p className="text-sm font-bold text-[#0a2540]">Draft Jobs</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Create job posts and save them to publish later.
                </p>
              </li>
              <li className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-card ring-1 ring-slate-200/80">
                  <MessageCircle className="h-6 w-6" strokeWidth={2} />
                </div>
                <p className="text-sm font-bold text-[#0a2540]">Read Messages (Cached)</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  View your recent messages that are already loaded.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-site space-y-4 px-4 pb-12 sm:px-6">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-200/70 bg-brand-50/80 px-4 py-4 sm:flex-nowrap sm:px-5">
            <Wifi className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={2.25} />
            <p className="min-w-0 flex-1 text-left text-sm leading-relaxed text-[#0a2540]">
              <span className="font-bold text-brand-800">We&apos;ll automatically reconnect</span>
              <span className="text-slate-700"> — We&apos;re checking your connection. This page will refresh when you&apos;re back online.</span>
            </p>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" aria-hidden />
          </div>

          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-card sm:flex-row sm:items-center sm:gap-8 sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#0a2540]">Still having issues?</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  If the problem continues, you can reach us through our offline channels.
                </p>
              </div>
            </div>
            <div className="hidden h-12 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
            <ul className="flex shrink-0 flex-col gap-3 text-sm sm:min-w-[220px]">
              <li>
                <a
                  href="tel:+639179157515"
                  className="inline-flex items-center gap-2 font-semibold text-[#0a2540] transition hover:text-brand-700"
                >
                  <Phone className="h-4 w-4 text-brand-600" />
                  0917 915 7515
                </a>
              </li>
              <li>
                <a
                  href="mailto:admin@localpro.asia"
                  className="inline-flex items-center gap-2 font-semibold text-[#0a2540] transition hover:text-brand-700"
                >
                  <Mail className="h-4 w-4 text-brand-600" />
                  admin@localpro.asia
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
