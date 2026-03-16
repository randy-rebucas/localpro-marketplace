import Link from "next/link";
import { MapPin } from "lucide-react";

const PLATFORM_LINKS = [
  { href: "/register?role=client",   label: "Post a Job" },
  { href: "/register?role=provider", label: "Become a Provider" },
  { href: "/board",                  label: "Job Board" },
  { href: "/login",                  label: "Log in" },
  { href: "/register",               label: "Sign up" },
];

const EXPLORE_LINKS = [
  { href: "/jobs",          label: "Browse Jobs" },
  { href: "/providers",     label: "Browse Providers" },
  { href: "/refer",         label: "Refer & Earn" },
  { href: "/peso-program",  label: "PESO Partnership" },
];

const LEGAL_LINKS = [
  { href: "/privacy",             label: "Privacy Policy" },
  { href: "/terms",               label: "Terms of Service" },
  { href: "/provider-agreement",  label: "Provider Agreement" },
  { href: "/client-agreement",    label: "Client Agreement" },
  { href: "/escrow-policy",       label: "Escrow Policy" },
  { href: "/refund-policy",       label: "Refund Policy" },
  { href: "/dispute-resolution",  label: "Dispute Resolution" },
];

/**
 * Shared dark footer used across all public-facing pages.
 * Server Component — no client state needed.
 */
export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-10 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 sm:gap-10 mb-8 sm:mb-10">
          {/* Brand blurb */}
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-300" />
              <span className="text-base font-bold">
                <span className="text-primary-300">Local</span><span className="text-brand-400">Pro</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The trusted marketplace connecting Filipino clients with verified local service professionals.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-x-10 sm:gap-x-16 gap-y-8">
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Platform</p>
              <ul className="space-y-2 text-sm">
                {PLATFORM_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Explore</p>
              <ul className="space-y-2 text-sm">
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
          <p>Made with ❤️ in the Philippines</p>
        </div>
      </div>
    </footer>
  );
}
