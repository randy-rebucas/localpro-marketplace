import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "PESO Program | LocalPro — Partnering for Inclusive Growth",
  description:
    "LocalPro partners with PESO (Public Employment Service Offices) across the Philippines to connect qualified workers with local job opportunities. Register your PESO office today.",
  keywords: [
    "PESO Philippines",
    "Public Employment Service Office",
    "PESO job referral",
    "PESO LocalPro",
    "workforce Philippines",
    "government job placement Philippines",
    "LGU jobs Philippines",
    "DOLE PESO",
  ],
  openGraph: {
    title: "PESO Program | LocalPro",
    description:
      "LocalPro partners with PESO offices to connect jobseekers with verified local opportunities and empower communities through digital transformation.",
    url: `${APP_URL}/peso-program`,
  },
};

/* ── tiny SVG icon helpers ──────────────────────────────────── */

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V10M15 21V10M9 10h6" />
    </svg>
  );
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  );
}

function PresentationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h20M21 3v11a2 2 0 01-2 2H5a2 2 0 01-2-2V3M8 21l4-4 4 4M12 17v-4" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12h.01" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" /><path d="M4 20v-1a8 8 0 0116 0v1" />
    </svg>
  );
}

function PillarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18M3 5h18M4 5v16M8 5v16M16 5v16M20 5v16M3 3h18" />
    </svg>
  );
}

/* ── PESO building illustration for CTA ─────────────────────── */

function PesoBuilding() {
  return (
    <svg viewBox="0 0 200 160" className="w-44 h-36" fill="none">
      {/* Ground */}
      <rect x="10" y="140" width="180" height="4" rx="2" fill="#22c55e" opacity="0.3" />
      {/* Trees left */}
      <ellipse cx="30" cy="128" rx="18" ry="22" fill="#16a34a" opacity="0.7" />
      <rect x="27" y="138" width="6" height="8" rx="1" fill="#15803d" />
      {/* Trees right */}
      <ellipse cx="170" cy="128" rx="18" ry="22" fill="#16a34a" opacity="0.7" />
      <rect x="167" y="138" width="6" height="8" rx="1" fill="#15803d" />
      {/* Building body */}
      <rect x="55" y="55" width="90" height="90" rx="3" fill="#166534" />
      {/* Roof trim */}
      <rect x="50" y="50" width="100" height="10" rx="2" fill="#15803d" />
      {/* Top sign */}
      <rect x="68" y="30" width="64" height="24" rx="2" fill="#14532d" />
      <text x="100" y="47" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#4ade80" fontFamily="sans-serif">PESO</text>
      {/* Flag pole */}
      <line x1="100" y1="14" x2="100" y2="32" stroke="#166534" strokeWidth="2" />
      <rect x="100" y="14" width="14" height="9" rx="1" fill="#22c55e" />
      {/* Windows row 1 */}
      <rect x="68" y="72" width="16" height="18" rx="1" fill="#bbf7d0" opacity="0.6" />
      <rect x="92" y="72" width="16" height="18" rx="1" fill="#bbf7d0" opacity="0.6" />
      <rect x="116" y="72" width="16" height="18" rx="1" fill="#bbf7d0" opacity="0.6" />
      {/* Windows row 2 */}
      <rect x="68" y="98" width="16" height="18" rx="1" fill="#bbf7d0" opacity="0.6" />
      <rect x="116" y="98" width="16" height="18" rx="1" fill="#bbf7d0" opacity="0.6" />
      {/* Door */}
      <rect x="88" y="108" width="24" height="32" rx="2" fill="#14532d" />
      <circle cx="108" cy="125" r="2" fill="#4ade80" />
    </svg>
  );
}

/* ── city seal placeholder ──────────────────────────────────── */

function CitySeal({ abbr, city }: { abbr: string; city: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-16 w-16 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center shadow-sm">
        <span className="text-[10px] font-black text-slate-500 text-center leading-tight">{abbr}</span>
      </div>
      <p className="text-[11px] font-medium text-slate-500 text-center leading-tight">{city}</p>
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────── */

export default function PesoPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home",         item: APP_URL },
              { "@type": "ListItem", position: 2, name: "PESO Program", item: `${APP_URL}/peso-program` },
            ],
          }),
        }}
      />

      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative bg-white overflow-hidden border-b border-slate-100">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">

              {/* Left */}
              <div className="py-14 flex flex-col justify-center lg:pr-10">
                <p className="text-[#22c55e] text-xs font-bold uppercase tracking-widest mb-4">
                  PESO Program
                </p>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
                  Partnering for Inclusive
                  <br />
                  <span className="text-[#22c55e]">Growth and Opportunities</span>
                </h1>
                <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-md">
                  The PESO Program (Public Employment Service Office) connects jobseekers with
                  verified local opportunities and empowers communities through digital transformation.
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-6 mb-8">
                  {[
                    { icon: <GroupIcon className="h-5 w-5 text-emerald-600" />, label: "More local jobs for jobseekers" },
                    { icon: <BuildingIcon className="h-5 w-5 text-emerald-600" />, label: "Stronger partnerships with LGUs" },
                    { icon: <ChartIcon className="h-5 w-5 text-emerald-600" />, label: "Empowered communities, better futures" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        {s.icon}
                      </div>
                      <span className="text-xs font-medium text-slate-600 max-w-[120px] leading-tight">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register?role=peso"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#166534] text-white text-sm font-bold hover:bg-[#14532d] transition-colors shadow-sm"
                  >
                    Partner With Us
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                  >
                    Learn More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right: photo + floating card */}
              <div className="relative hidden lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-white/5" />

                {/* Floating card */}
                <div className="absolute bottom-10 right-8 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-[240px]">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 11h-3a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3a2 2 0 00-2-2zM7 11H4a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3a2 2 0 00-2-2zM12 2a3 3 0 110 6 3 3 0 010-6zM12 8v3M7.5 14.5l-3 3M16.5 14.5l3 3" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-snug mb-1">
                        Working Together For Our Communities
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        LocalPro collaborates with PESO offices to bridge talent and opportunity at the local level.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────── */}
        <section id="how-it-works" className="py-16 bg-white">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                How the PESO Program Works
              </h2>
              <p className="text-slate-500 text-sm">A simple, effective collaboration that creates real impact.</p>
            </div>

            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Dotted connector — desktop only */}
              <div className="absolute top-10 left-[12.5%] right-[12.5%] hidden lg:block border-t-2 border-dashed border-emerald-200 pointer-events-none" style={{ zIndex: 0 }} />

              {[
                { n: "1", title: "Partnership",         desc: "We partner with PESO offices to understand local needs and opportunities.",              Icon: BuildingIcon  },
                { n: "2", title: "Job Matching",        desc: "We connect qualified jobseekers with verified local jobs and service opportunities.",    Icon: GroupIcon     },
                { n: "3", title: "Training & Upskilling", desc: "We provide access to training resources to help jobseekers build in-demand skills.", Icon: PresentationIcon },
                { n: "4", title: "Employment & Growth", desc: "More local employment, stronger communities, sustainable growth.",                       Icon: ChartIcon     },
              ].map(({ n, title, desc, Icon }) => (
                <div key={n} className="relative flex flex-col items-center text-center z-10">
                  {/* Step number badge */}
                  <div className="h-8 w-8 rounded-full bg-[#166534] text-white text-xs font-extrabold flex items-center justify-center mb-3 shadow-sm">
                    {n}
                  </div>
                  {/* Icon circle */}
                  <div className="h-20 w-20 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-4">
                    <Icon className="h-9 w-9 text-emerald-700" />
                  </div>
                  <p className="font-bold text-slate-900 text-sm mb-2">{title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Benefits ─────────────────────────────────────────── */}
        <section className="py-16 bg-slate-50 border-t border-slate-100">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                Benefits for Our Partners and Communities
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "For Jobseekers",
                  Icon: PersonIcon,
                  items: ["Access to more local job opportunities", "Free training and upskilling resources", "Guidance and career support"],
                },
                {
                  title: "For PESO Offices",
                  Icon: BuildingIcon,
                  items: ["Digital tools to streamline services", "Wider reach for local job postings", "Data-driven insights and reporting"],
                },
                {
                  title: "For Local Businesses",
                  Icon: BriefcaseIcon,
                  items: ["Connect with pre-screened talent", "Promote job openings for free", "Grow with your local community"],
                },
                {
                  title: "For Communities",
                  Icon: HeartIcon,
                  items: ["More employment opportunities", "Stronger local economy", "Better quality of life"],
                },
              ].map(({ title, Icon, items }) => (
                <div key={title} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-emerald-700" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-500 leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Our Commitment ───────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-slate-100">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Our Commitment</h2>
              <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
                We are committed to transparency, inclusivity, and creating lasting impact through strong partnerships with PESO offices nationwide.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Inclusive Opportunities", desc: "We promote equal access to jobs for all.",                    Icon: PersonIcon   },
                { title: "Transparency",             desc: "We ensure fair and open processes.",                          Icon: PillarIcon   },
                { title: "Data Protection",          desc: "We protect the privacy and data of every user.",             Icon: LockIcon     },
                { title: "Sustainable Impact",       desc: "We work together for long-term community growth.",           Icon: BriefcaseIcon },
              ].map(({ title, desc, Icon }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">{title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────── */}
        <section className="bg-emerald-50 border-t border-b border-emerald-100 py-10">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Illustration */}
              <div className="shrink-0">
                <PesoBuilding />
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">
                  Let's build better opportunities together.
                </p>
                <p className="text-sm text-slate-500">
                  Join the PESO Program and help transform lives in your community.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <Link
                  href="/register?role=peso"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-[#166534] text-white text-sm font-bold hover:bg-[#14532d] transition-colors shadow-sm whitespace-nowrap"
                >
                  Partner With Us
                </Link>
                <Link
                  href="#how-it-works"
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Learn more about the program →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Partner PESO Offices ─────────────────────────────── */}
        <section className="py-14 bg-white border-t border-slate-100">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Partner PESO Offices</h2>
            <p className="text-sm text-slate-400 mb-10">We're proud to work with PESO offices across the country.</p>

            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
              <CitySeal abbr="PESO MNL" city="PESO Manila" />
              <CitySeal abbr="PESO QC"  city="PESO Quezon City" />
              <CitySeal abbr="PESO DAV" city="PESO Davao City" />
              <CitySeal abbr="PESO CEB" city="PESO Cebu City" />
              <CitySeal abbr="PESO ILO" city="PESO Iloilo City" />
              {/* And many more */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                  <BuildingIcon className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-[11px] font-medium text-slate-400 text-center">And many<br />more...</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
