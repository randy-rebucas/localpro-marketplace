import Link from "next/link";
import { Apple, Facebook, Instagram, Linkedin, Play, Youtube } from "lucide-react";

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
  { href: "/support", label: "Press" },
];

const FOR_CUSTOMERS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/support", label: "Help Center" },
  { href: "/support", label: "Safety & Trust" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

const FOR_PROS = [
  { href: "/for-pros", label: "Become a Pro" },
  { href: "/blog", label: "Pro Resources" },
  { href: "/peso-program", label: "PESO Program" },
  { href: "/refer", label: "Refer & Earn" },
  { href: "/login", label: "Pro Login" },
];

const FOR_BUSINESSES = [
  { href: "/for-businesses", label: "Business Solutions" },
  { href: "/support", label: "Partner With Us" },
  { href: "/register?role=client", label: "List Your Business" },
];

const SOCIAL = [
  { href: "https://www.facebook.com/localproasia", label: "Facebook", Icon: Facebook },
  { href: "https://www.instagram.com/", label: "Instagram", Icon: Instagram },
  { href: "https://www.tiktok.com/", label: "TikTok", Icon: TikTokIcon },
  { href: "https://www.linkedin.com/company/localproasia", label: "LinkedIn", Icon: Linkedin },
  { href: "https://www.youtube.com/", label: "YouTube", Icon: Youtube },
];

/** Public legal & policy pages (same routes as terms/privacy footers). */
const FOOTER_LEGAL = [
  { href: "/client-agreement", label: "Client Agreement" },
  { href: "/provider-agreement", label: "Provider Agreement" },
  { href: "/escrow-policy", label: "Escrow Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/dispute-resolution", label: "Dispute Resolution" },
  { href: "/support", label: "Support" },
] as const;
/**
 * Marketing footer — five columns (brand, company, customers, pros, social) + legal strip.
 */
export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0a2540] text-slate-300">
      <div className="mx-auto max-w-site px-4 py-7 sm:px-6">
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.85fr_1fr_1fr_1.05fr_1.2fr] lg:gap-10">
          <div className="flex max-w-xs flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <img
                src="/logo-only.png"
                alt=""
                width={876}
                height={471}
                decoding="async"
                className="h-12 w-auto max-h-12 shrink-0 object-contain object-left"
              />
              <div className="flex min-w-0 flex-col items-start justify-start">
                <span className="text-2xl font-bold leading-tight tracking-tight text-white">
                  Local<span className="text-brand-400">Pro</span>
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-white/85">
              Your trusted partner for home, business, and property services. Connecting you with verified local professionals you can count on.
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              {SOCIAL.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 transition-colors hover:text-brand-300"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Company</p>
            <ul className="space-y-3 text-sm text-white/85">
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
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">For Customers</p>
            <ul className="space-y-3 text-sm text-white/85">
              {FOR_CUSTOMERS.map((l) => (
                <li key={`${l.href}-${l.label}`}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">For Pros</p>
            <ul className="space-y-3 text-sm text-white/85">
              {FOR_PROS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">For Businesses</p>
            <ul className="space-y-3 text-sm text-white/85">
              {FOR_BUSINESSES.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-white/15 lg:border-l lg:pl-10">
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Download the App</p>
            <div className="flex max-w-[150px] flex-col gap-3">
              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download on the App Store"
                className="flex items-center gap-2 rounded-md bg-black px-3 py-2 text-white ring-1 ring-white/20 transition hover:bg-slate-900"
              >
                <Apple className="h-6 w-6 shrink-0" />
                <span className="leading-none">
                  <span className="block text-[9px] uppercase tracking-wide text-white/80">Download on the</span>
                  <span className="block text-lg font-semibold tracking-tight">App Store</span>
                </span>
              </a>
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
                className="flex items-center gap-2 rounded-md bg-black px-3 py-2 text-white ring-1 ring-white/20 transition hover:bg-slate-900"
              >
                <Play className="h-6 w-6 shrink-0 fill-current text-brand-400" />
                <span className="leading-none">
                  <span className="block text-[9px] uppercase tracking-wide text-white/80">Get it on</span>
                  <span className="block text-lg font-semibold tracking-tight">Google Play</span>
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-5 text-sm text-white/80 sm:flex-row sm:items-center">
          <p className="text-center sm:text-left shrink-0">© {year} LocalPro. All rights reserved.</p>
          <nav
            className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-2 text-center sm:justify-end sm:max-w-[min(100%,42rem)] lg:max-w-none"
            aria-label="Legal and policies"
          >
            {FOOTER_LEGAL.map((item, index) => (
              <span key={item.href} className="inline-flex items-center">
                {index > 0 ? (
                  <span className="px-2 text-white/35 select-none" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link href={item.href} className="whitespace-nowrap hover:text-white transition-colors">
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
