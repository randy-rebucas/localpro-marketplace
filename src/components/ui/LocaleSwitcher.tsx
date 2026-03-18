"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { LOCALE_COOKIE } from "@/i18n/config";

const LABELS: Record<string, string> = {
  en: "EN",
  tl: "TL",
};

const FULL_LABELS: Record<string, string> = {
  en: "English",
  tl: "Filipino",
};

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(locale);
  const next = current === "en" ? "tl" : "en";

  async function handleSwitch() {
    if (isPending) return;

    startTransition(async () => {
      try {
        // Persist to DB + set cookie via API
        await fetch("/api/user/locale", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });

        // Optimistically set the cookie client-side so the label changes instantly
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

        setCurrent(next);

        // Hard reload so the server re-resolves the new locale and loads fresh messages
        window.location.reload();
      } catch {
        // silently ignore — worst case the user sees the old language until next navigation
      }
    });
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      title={`Switch to ${FULL_LABELS[next]}`}
      aria-label={`Switch to ${FULL_LABELS[next]}`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold
        text-slate-600 hover:bg-slate-100 hover:text-slate-900
        dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100
        transition-colors disabled:opacity-50 select-none ${className}`}
    >
      <Globe className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{LABELS[current]}</span>
    </button>
  );
}
