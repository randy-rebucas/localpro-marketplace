import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Shared sticky header used across all public-facing pages.
 * Server Component — no client state needed.
 */
export default async function PublicHeader() {
  const t = await getTranslations("publicHeader");
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-xl font-bold">
            <span className="text-primary">Local</span><span className="text-brand">Pro</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/jobs"
            className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            {t("browseJobs")}
          </Link>
          <Link
            href="/providers"
            className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            {t("providers")}
          </Link>
          <Link
            href="/peso-program"
            className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            {t("peso")}
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            {t("logIn")}
          </Link>
          <Link href="/register" className="btn-primary text-sm shadow-sm ml-1">
            {t("getStarted")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
