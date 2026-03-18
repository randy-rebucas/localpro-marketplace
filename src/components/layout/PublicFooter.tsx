import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

const PLATFORM_LINKS = [
  { href: "/register?role=client",   label: "postAJob" },
  { href: "/register?role=provider", label: "becomeAProvider" },
  { href: "/board",                  label: "jobBoard" },
  { href: "/login",                  label: "logIn" },
  { href: "/register",               label: "signUp" },
];

const EXPLORE_LINKS = [
  { href: "/jobs",          label: "browseJobs" },
  { href: "/providers",     label: "browseProviders" },
  { href: "/refer",         label: "referAndEarn" },
  { href: "/peso-program",  label: "pesoPartnership" },
];

const LEGAL_LINKS = [
  { href: "/privacy",             label: "privacyPolicy" },
  { href: "/terms",               label: "termsOfService" },
  { href: "/provider-agreement",  label: "providerAgreement" },
  { href: "/client-agreement",    label: "clientAgreement" },
  { href: "/escrow-policy",       label: "escrowPolicy" },
  { href: "/refund-policy",       label: "refundPolicy" },
  { href: "/dispute-resolution",  label: "disputeResolution" },
];

/**
 * Shared dark footer used across all public-facing pages.
 * Server Component — no client state needed.
 */
export default async function PublicFooter() {
  const t = await getTranslations("publicFooter");
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
              {t("tagline")}
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-x-10 sm:gap-x-16 gap-y-8">
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">{t("columnPlatform")}</p>
              <ul className="space-y-2 text-sm">
                {PLATFORM_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{t(l.label)}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">{t("columnExplore")}</p>
              <ul className="space-y-2 text-sm">
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{t(l.label)}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">{t("columnLegal")}</p>
              <ul className="space-y-2 text-sm">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{t(l.label)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>{t("allRightsReserved", { year: new Date().getFullYear() })}</p>
          <p>{t("madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
