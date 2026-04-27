import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

/** TikTok icon (not in lucide set used here) */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const COMPANY = [
  { href: "/support", label: "About Us" },
  { href: "mailto:support@localpro.asia?subject=Careers%20inquiry", label: "Careers" },
  { href: "/blog", label: "Blog" },
  { href: "/support", label: "Contact Us" },
];

const FOR_CUSTOMERS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/support", label: "Help Center" },
  { href: "/register?role=client", label: "Post a Job" },
  { href: "/jobs", label: "Browse Jobs" },
  { href: "/providers", label: "Find a Pro" },
];

const FOR_PROS = [
  { href: "/register?role=provider", label: "Become a Pro" },
  { href: "/blog", label: "Pro Resources" },
  { href: "/login", label: "Pro Login" },
  { href: "/board", label: "Job Board" },
];

const SOCIAL = [
  { href: "https://www.facebook.com/localproasia", label: "Facebook", Icon: Facebook },
  { href: "https://www.instagram.com/", label: "Instagram", Icon: Instagram },
  { href: "https://www.tiktok.com/", label: "TikTok", Icon: TikTokIcon },
  { href: "https://www.linkedin.com/company/localproasia", label: "LinkedIn", Icon: Linkedin },
  { href: "https://www.youtube.com/", label: "YouTube", Icon: Youtube },
];

/**
 * Marketing footer — five columns (brand, company, customers, pros, social) + legal strip.
 */
export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0a2540] text-slate-400 py-12 sm:py-16 px-4 sm:px-6">
      <div className="max-w-site mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 xl:gap-10 mb-12">
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col gap-4 max-w-sm">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <img
                src="/logo-only.png"
                alt=""
                width={876}
                height={471}
                decoding="async"
                className="h-11 w-auto max-h-11 object-contain object-left sm:h-12 sm:max-h-12 shrink-0"
              />
              <div className="flex flex-col items-start justify-start min-w-0">
                <span className="text-lg font-bold text-white tracking-tight leading-tight">
                  Local<span className="text-brand-400">Pro</span>
                </span>
                <span className="text-xs text-slate-500 leading-snug">Your Trusted Local Pros</span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connecting homes and businesses with verified local professionals across the Philippines — one trusted job at a time.
            </p>
            <p className="text-xs text-slate-500 pt-1">© {year} LocalPro. All rights reserved.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Company</p>
            <ul className="space-y-3 text-sm">
              {COMPANY.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("mailto:") ? (
                    <a href={l.href} className="hover:text-white transition-colors">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">For Customers</p>
            <ul className="space-y-3 text-sm">
              {FOR_CUSTOMERS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">For Pros</p>
            <ul className="space-y-3 text-sm">
              {FOR_PROS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Stay Connected</p>
            <div className="flex flex-wrap gap-3">
              {SOCIAL.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600/80 text-slate-400 hover:text-white hover:border-brand hover:bg-brand/10 transition-colors"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700/80 pt-8 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
