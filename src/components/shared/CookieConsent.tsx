"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { injectMetaPixel } from "@/components/analytics/MetaPixel";

const STORAGE_KEY = "lp_cookie_consent";

export type ConsentDecision = "accepted" | "declined" | null;

function getStoredConsent(): ConsentDecision {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "declined") return v;
  } catch {/* SSR or storage blocked */}
  return null;
}

function storeConsent(decision: "accepted" | "declined"): void {
  try {
    localStorage.setItem(STORAGE_KEY, decision);
    localStorage.setItem(`${STORAGE_KEY}_ts`, new Date().toISOString());
  } catch {/* storage blocked */}
}

/**
 * Cookie consent banner — blocks GTM from loading until the user explicitly
 * accepts analytics cookies. Appears once per browser; decision persists in
 * localStorage.
 *
 * Mount once in the root layout: <CookieConsent />
 */
export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const [decision, setDecision] = useState<ConsentDecision | "pending">("pending");

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setDecision(stored);
      if (stored === "accepted") {
        injectGTM();
        injectMetaPixel();
      }
    } else {
      setDecision(null); // show banner
    }
  }, []);

  function accept() {
    storeConsent("accepted");
    setDecision("accepted");
    injectGTM();
    injectMetaPixel();
  }

  function decline() {
    storeConsent("declined");
    setDecision("declined");
  }

  // Don't render during SSR or after a decision is already stored
  if (decision === "pending" || decision === "accepted" || decision === "declined") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 bg-slate-900 border-t border-slate-700 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-slate-300">
          <p>
            {t("body")}{" "}
            <Link href="/privacy" className="underline text-indigo-400 hover:text-indigo-300">
              {t("privacyLink")}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {t("decline")}
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dynamically inject GTM after consent ─────────────────────────────────────

function injectGTM() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtmId) return;

  // Avoid double-inject
  if (document.getElementById("gtm-script")) return;

  const script = document.createElement("script");
  script.id    = "gtm-script";
  script.async = true;
  script.src   = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);

  // dataLayer push
  (window as Window & { dataLayer?: unknown[] }).dataLayer =
    (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
  (window as Window & { dataLayer?: unknown[] }).dataLayer!.push({
    "gtm.start": new Date().getTime(),
    event:       "gtm.js",
  });
}
