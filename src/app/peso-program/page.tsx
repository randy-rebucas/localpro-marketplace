import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Building2, Users, Briefcase, ArrowRight, Globe, ShieldCheck, BarChart3 } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "PESO Integration | LocalPro — Public Employment Service Office",
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
    title: "PESO x LocalPro | Government Job Placement Partnership",
    description:
      "LocalPro integrates directly with PESO offices to bring government-endorsed jobs to qualified local workers — digitally and securely.",
    url: `${APP_URL}/peso-program`,
  },
};

export default function PesoPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "LocalPro × PESO Partnership",
            url: `${APP_URL}/peso-program`,
            areaServed: {
              "@type": "Country",
              name: "Philippines",
            },
            description:
              "LocalPro partners with Public Employment Service Offices (PESO) across the Philippines to digitise job referral and placement workflows.",
            parentOrganization: {
              "@type": "Organization",
              name: "LocalPro",
              url: APP_URL,
            },
          }),
        }}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="text-base font-bold text-primary tracking-tight">
            LocalPro
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Register PESO Office
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-blue-300">
            <Building2 className="h-4 w-4" />
            Official Government Partnership Program
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            LocalPro for
            <br />
            <span className="text-blue-400">PESO Offices</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Digitise your job referral and placement workflow. LocalPro integrates directly
            with Public Employment Service Offices (PESO) to connect qualified local workers
            with verified service jobs — with full escrow payment protection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              href="/register?role=peso"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-colors text-base"
            >
              Register Your PESO Office <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/register?role=provider"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-colors text-base"
            >
              Register as a Worker
            </Link>
          </div>
        </div>
      </section>

      {/* LGU Partners */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest shrink-0">
            LGU Partner
          </p>
          <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-5 py-2.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/official_seal_ormoc.png"
              alt="Official Seal of Ormoc City"
              width={36}
              height={36}
              className="rounded-full object-contain"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Ormoc City</p>
              <p className="text-xs text-slate-500 mt-0.5">Leyte · Official PESO Partner</p>
            </div>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-primary text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-3 divide-x divide-blue-400/30">
          {[
            { value: "LGU-Ready", label: "City & Municipal Level" },
            { value: "Escrow", label: "Secure Payment Protection" },
            { value: "KYC", label: "Identity-Verified Workers" },
          ].map((stat) => (
            <div key={stat.label} className="px-4 sm:px-8 text-center">
              <p className="text-xl sm:text-2xl font-extrabold">{stat.value}</p>
              <p className="text-xs sm:text-sm text-blue-200 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What is PESO section */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              What is a PESO Office?
            </h2>
            <p className="text-slate-500 text-base max-w-2xl mx-auto">
              PESO (Public Employment Service Office) is a non-fee charging multi-employment service
              facility established in cities and municipalities across the Philippines under DOLE.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Building2 className="h-6 w-6 text-primary" />,
                title: "City & Municipal Offices",
                body: "Every LGU in the Philippines operates a PESO office to provide free employment services to residents.",
              },
              {
                icon: <Users className="h-6 w-6 text-primary" />,
                title: "Worker Referral",
                body: "PESO officers refer qualified workers from their local registry to employers and job opportunities.",
              },
              {
                icon: <Briefcase className="h-6 w-6 text-primary" />,
                title: "Job Facilitation",
                body: "PESO offices facilitate placements, job fairs, and livelihood programs under PhilJobNet and DOLE mandates.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How LocalPro + PESO works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How LocalPro × PESO Works
            </h2>
            <p className="text-slate-500 text-base">
              A streamlined digital workflow from job creation to worker payment.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "PESO Officer Posts a Job",
                body: "The PESO officer creates a job on LocalPro, tagged as a PESO/LGU referral. Jobs are reviewed and published to the live marketplace.",
                badge: "PESO Action",
              },
              {
                step: "2",
                title: "Workers from the PESO Registry Apply",
                body: "Registered workers referred by the PESO office see the job and submit quotes. Only PESO-referred or KYC-verified providers are eligible.",
                badge: "Worker Action",
              },
              {
                step: "3",
                title: "Client Selects & Funds Escrow",
                body: "The client (company, household, or LGU) accepts a quote and funds escrow via GCash, Maya, or bank transfer. Payments are held securely.",
                badge: "Client Action",
              },
              {
                step: "4",
                title: "Job Completed & Worker Paid",
                body: "After job completion, escrow is released to the worker. The PESO office can track placement outcomes and payment records in real-time.",
                badge: "System Action",
              },
            ].map((step) => (
              <div key={step.step} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-base shrink-0">
                    {step.step}
                  </div>
                  {step.step !== "4" && <div className="w-0.5 flex-1 bg-slate-200 mt-2" />}
                </div>
                <div className="pb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{step.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Benefits for PESO Offices
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: <Globe className="h-5 w-5" />, title: "Digital Job Listings", body: "Post and manage job listings online — no paperwork, no spreadsheets." },
              { icon: <ShieldCheck className="h-5 w-5" />, title: "Verified Worker Registry", body: "Workers are KYC-verified on LocalPro, reducing fraud and no-shows." },
              { icon: <CheckCircle2 className="h-5 w-5" />, title: "Escrow Payment Assurance", body: "Workers are guaranteed payment via escrow — no more unpaid placements." },
              { icon: <BarChart3 className="h-5 w-5" />, title: "Placement Analytics", body: "Track referrals, placements, and earnings directly from the PESO dashboard." },
              { icon: <Users className="h-5 w-5" />, title: "Bulk Worker Referral", body: "Refer multiple workers to a single job — ideal for barangay livelihood programs." },
              { icon: <Briefcase className="h-5 w-5" />, title: "Free for PESO Offices", body: "PESO registration and job posting on LocalPro is completely free of charge." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Ready to digitalise your PESO office?
          </h2>
          <p className="text-blue-100 text-base">
            Join LocalPro as a PESO partner. Setup takes less than 10 minutes.
            All placements are tracked, verified, and escrow-protected.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?role=peso"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-blue-50 transition-colors"
            >
              Register PESO Office <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/register?role=provider"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
            >
              Register as a Worker
            </Link>
          </div>
          <p className="text-xs text-blue-200 mt-4">
            Questions? Email us at{" "}
            <a href="mailto:support@localpro.asia" className="underline hover:text-white">
              support@localpro.asia
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
          <p className="mt-1">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            {" · "}
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            {" · "}
            <Link href="/jobs" className="hover:underline">Browse Jobs</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
