"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2, MapPin, Menu, Navigation, X } from "lucide-react";
import { useVisitorLocation } from "@/hooks/useVisitorLocation";
import LocationPickerInput from "@/components/layout/LocationPickerInput";

const navLinkClass =
  "relative flex h-20 items-center px-2 text-sm font-semibold text-[#0a2540] transition-colors hover:text-brand-700";
const navActiveClass =
  "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-brand";

function NavDropdown({
  label,
  active = false,
  children,
}: {
  label: string;
  active?: boolean;
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
        className={`${navLinkClass} gap-1 ${active ? navActiveClass : ""}`}
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");
  const { label: visitorLocation, setLocation, resetToAutomaticLocation, isManual } = useVisitorLocation();

  useEffect(() => {
    if (locationOpen) setPendingLabel(visitorLocation);
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

  const servicesActive = pathname === "/jobs" || pathname.startsWith("/providers") || pathname.startsWith("/board");
  const resourcesActive = pathname.startsWith("/blog") || pathname.startsWith("/peso-program");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white shadow-[0_1px_0_rgba(10,37,64,0.04)]">
      <div className="relative mx-auto flex h-20 w-full items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="relative z-10 flex h-full min-h-0 max-w-[min(360px,70vw)] shrink-0 items-center gap-2.5"
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
            className="block h-12 w-auto max-h-12 shrink-0 object-contain object-center"
          />
          <img
            src="/logo-text.png"
            alt="LocalPro — Your Trusted Local Pros"
            width={537}
            height={192}
            decoding="async"
            fetchPriority="high"
            className="block h-12 w-auto min-w-0 max-h-12 object-contain object-left"
          />
        </Link>

        <nav
          className="hidden xl:flex absolute left-1/2 top-0 h-20 -translate-x-1/2 items-center justify-center gap-7 whitespace-nowrap"
          aria-label="Main"
        >
          <NavDropdown label="Services" active={servicesActive}>
            <DropdownLink href="/jobs">Browse open jobs</DropdownLink>
            <DropdownLink href="/providers">Find professionals</DropdownLink>
            <DropdownLink href="/board">Public job board</DropdownLink>
          </NavDropdown>
          <Link
            href="/for-businesses"
            className={`${navLinkClass} ${pathname === "/for-businesses" ? navActiveClass : ""}`}
          >
            For Businesses
          </Link>
          <Link
            href="/for-pros"
            className={`${navLinkClass} ${pathname === "/for-pros" ? navActiveClass : ""}`}
          >
            For Pros
          </Link>
          <Link
            href="/support"
            className={`${navLinkClass} ${pathname === "/support" ? navActiveClass : ""}`}
          >
            About Us
          </Link>
          <NavDropdown label="Resources" active={resourcesActive}>
            <DropdownLink href="/blog">Blog</DropdownLink>
            <DropdownLink href="/support">Help &amp; support</DropdownLink>
            <DropdownLink href="/peso-program">PESO program</DropdownLink>
          </NavDropdown>
        </nav>

        <div className="z-10 flex h-full min-h-0 shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            className="hidden h-full min-h-0 max-w-[min(170px,18vw)] min-w-0 items-center gap-2 rounded-lg px-1.5 text-left text-sm font-semibold text-[#0a2540] transition-colors hover:bg-slate-50 hover:text-slate-800 md:inline-flex"
            title={`${visitorLocation}${isManual ? " (custom)" : ""} — click to change`}
            aria-haspopup="dialog"
            aria-expanded={locationOpen}
          >
            <MapPin className="h-4 w-4 shrink-0 self-center text-brand" strokeWidth={2.5} aria-hidden />
            <span className="truncate" suppressHydrationWarning>
              {visitorLocation}
            </span>
          </button>
          <Link
            href="/login"
            className="hidden rounded-lg border border-brand-300 px-5 py-2.5 text-sm font-semibold text-[#0a2540] transition-colors hover:border-brand-500 hover:bg-brand-50 sm:inline-flex"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Sign Up
          </Link>
          <button
            type="button"
            className="xl:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1 shadow-inner">
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
          <Link href="/for-businesses" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            For businesses
          </Link>
          <Link href="/for-pros" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            For pros
          </Link>
          <Link href="/#how-it-works" className="block py-2 text-sm font-medium text-slate-800" onClick={() => setMobileOpen(false)}>
            How it works
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
              Search for your city or municipality in the Philippines.
            </p>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              City or municipality
            </label>
            <div className="mb-4">
              <LocationPickerInput
                initialValue={pendingLabel}
                onSelect={(label) => {
                  setLocation(label);
                  setLocationOpen(false);
                }}
              />
            </div>
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
                Use GPS location
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
