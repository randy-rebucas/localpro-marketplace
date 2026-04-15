import Link from "next/link";
import { MapPin } from "lucide-react";

/**
 * Shared sticky header used across all public-facing pages.
 * Server Component — no client state needed.
 */
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm" suppressHydrationWarning>
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
            Browse Jobs
          </Link>
          <Link
            href="/providers"
            className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Providers
          </Link>
          <Link
            href="/peso-program"
            className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            PESO
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link href="/register" className="btn-primary text-sm shadow-sm ml-1">
            Get started →
          </Link>
        </nav>
      </div>
    </header>
  );
}
