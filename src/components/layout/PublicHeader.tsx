"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2, MapPin, Menu, Navigation, X } from "lucide-react";
import { useVisitorLocation } from "@/hooks/useVisitorLocation";

function NavDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-[#0a2540] hover:text-primary-700 px-2.5 py-2 rounded-lg hover:bg-slate-50/80 transition-colors"
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full pt-1 z-50 min-w-[220px]">
          <div className="rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg ring-1 ring-slate-900/5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
    >
      {children}
    </Link>
  );
}

/**
 * Marketing header — logo left, nav centered, actions right (reference layout).
 */
export default function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const { label: visitorLocation, setLocation, resetToAutomaticLocation, isManual } = useVisitorLocation();

  useEffect(() => {
    if (locationOpen) setLocationDraft(visitorLocation);
  }, [locationOpen, visitorLocation]);

  useEffect(() => {
    if (!locationOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLocationOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locationOpen]);

  useEffect(() => {
    if (!locationOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locationOpen]);

  async function handleResetLocation() {
    setLocationBusy(true);
    try {
      await resetToAutomaticLocation();
    } finally {
      setLocationBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white shadow-[0_1px_0_rgba(10,37,64,0.04)]">
      <div className="relative max-w-site mx-auto px-4 sm:px-6 min-h-[4.75rem] h-[4.75rem] sm:min-h-[5rem] sm:h-[5rem] flex items-center justify-between gap-3">
        <Link
          href="/"
          className="relative z-10 flex h-full min-h-0 max-w-[min(560px,90vw)] shrink-0 items-center gap-2 sm:gap-2.5"
          aria-label="LocalPro — home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static public assets */}
          <img
            src="/logo-only.png"
            alt=""
            width={332}
            height={471}
            decoding="async"
            fetchPriority="high"
            aria-hidden
            className="block h-11 w-auto max-h-11 shrink-0 object-contain object-center sm:h-12 sm:max-h-12 md:h-[3.35rem] md:max-h-[3.35rem]"
          />
          <img
            src="/logo-text.png"
            alt="LocalPro — Your Trusted Local Pros"
            width={537}
            height={192}
            decoding="async"
            fetchPriority="high"
            className="block h-11 w-auto min-w-0 max-h-11 object-contain object-left sm:h-12 sm:max-h-12 md:h-[3.35rem] md:max-h-[3.35rem]"
          />
        </Link>

        <nav
          className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-0.5 xl:gap-1 whitespace-nowrap"
          aria-label="Main"
        >
          <NavDropdown label="Services">
            <DropdownLink href="/jobs">Browse open jobs</DropdownLink>
            <DropdownLink href="/providers">Find professionals</DropdownLink>
            <DropdownLink href="/board">Public job board</DropdownLink>
            <DropdownLink href="/register?role=client">Post a job</DropdownLink>
          </NavDropdown>
          <Link
            href="/register?role=client"
            className="text-sm font-medium text-[#0a2540] hover:text-primary-700 px-2.5 py-2 rounded-lg hover:bg-slate-50/80 transition-colors"
          >
            For Businesses
          </Link>
          <Link
            href="/register?role=provider"
            className="text-sm font-medium text-[#0a2540] hover:text-primary-700 px-2.5 py-2 rounded-lg hover:bg-slate-50/80 transition-colors"
          >
            For Pros
          </Link>
          <Link
            href="/support"
            className="text-sm font-medium text-[#0a2540] hover:text-primary-700 px-2.5 py-2 rounded-lg hover:bg-slate-50/80 transition-colors"
          >
            About Us
          </Link>
          <NavDropdown label="Resources">
            <DropdownLink href="/blog">Blog</DropdownLink>
            <DropdownLink href="/support">Help &amp; support</DropdownLink>
            <DropdownLink href="/peso-program">PESO program</DropdownLink>
            <DropdownLink href="/refer">Refer &amp; earn</DropdownLink>
          </NavDropdown>
        </nav>

        <div className="flex h-full min-h-0 items-center gap-2 sm:gap-3 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            className="hidden sm:inline-flex h-full min-h-0 items-center gap-2 text-xs font-medium text-slate-600 max-w-[min(180px,26vw)] min-w-0 rounded-lg px-1.5 -mx-1.5 hover:bg-slate-50 hover:text-slate-800 transition-colors text-left"
            title={`${visitorLocation}${isManual ? " (custom)" : ""} — click to change`}
            aria-haspopup="dialog"
            aria-expanded={locationOpen}
          >
            <MapPin className="h-[1.125rem] w-[1.125rem] text-brand shrink-0 self-center" strokeWidth={2.25} aria-hidden />
            <span className="truncate" suppressHydrationWarning>
              {visitorLocation}
            </span>
          </button>
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-semibold text-[#0a2540] border border-slate-300 hover:border-primary-400 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="inline-flex text-sm font-semibold bg-brand hover:bg-brand-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            Sign Up
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1 shadow-inner">
          <div className="flex items-center justify-between gap-2 py-2 text-xs font-medium text-slate-600 border-b border-slate-100 mb-2">
            <p className="flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="h-[1.125rem] w-[1.125rem] text-brand shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="truncate" title={visitorLocation}>
                {visitorLocation}
              </span>
            </p>
            <button
              type="button"
              className="shrink-0 text-primary-700 font-semibold hover:underline"
              onClick={() => {
                setMobileOpen(false);
                setLocationOpen(true);
              }}
            >
              Change
            </button>
          </div>
          <Link href="/jobs" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            Browse jobs
          </Link>
          <Link href="/providers" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            Find pros
          </Link>
          <Link href="/register?role=client" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            For businesses
          </Link>
          <Link href="/register?role=provider" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            For pros
          </Link>
          <Link href="/support" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            About / support
          </Link>
          <Link href="/blog" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            Blog
          </Link>
          <Link
            href="/login"
            className="block py-3 text-center text-sm font-semibold border border-slate-200 rounded-lg mt-2"
            onClick={() => setMobileOpen(false)}
          >
            Log In
          </Link>
        </div>
      )}

      {locationOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLocationOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-dialog-title"
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 p-5 sm:p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 id="location-dialog-title" className="text-base font-semibold text-[#0a2540]">
                Your location
              </h2>
              <button
                type="button"
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
                onClick={() => setLocationOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              We use this for local job search and suggestions. Enter a city or area you want to use.
            </p>
            <label className="block text-xs font-medium text-slate-500 mb-1.5" htmlFor="visitor-location-input">
              City or area
            </label>
            <input
              id="visitor-location-input"
              type="text"
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              placeholder="e.g. Manila, PH"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#0a2540] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary mb-4"
              autoComplete="address-level2"
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={locationBusy}
                onClick={handleResetLocation}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {locationBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Navigation className="h-4 w-4" aria-hidden />
                )}
                Use automatic location
              </button>
              <button
                type="button"
                disabled={locationBusy}
                onClick={() => {
                  setLocation(locationDraft);
                  setLocationOpen(false);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-brand hover:bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
