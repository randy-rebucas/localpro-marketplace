import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Services" },
  { id: "eligibility", title: "Eligibility" },
  { id: "accounts", title: "User Accounts" },
  { id: "payments", title: "Payments & Fees" },
  { id: "provider-terms", title: "Service Provider Terms" },
  { id: "client-terms", title: "Client Responsibilities" },
  { id: "conduct", title: "Content and Conduct" },
  { id: "disputes", title: "Dispute Resolution" },
  { id: "ip", title: "Intellectual Property" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "law", title: "Governing Law" },
  { id: "changes", title: "Changes to These Terms" },
  { id: "contact", title: "Contact Us" },
];

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the terms and conditions governing your use of the LocalPro Marketplace platform for local service professionals in the Philippines.",
  alternates: { canonical: `${APP_URL}/terms` },
  openGraph: {
    title: "Terms of Service | LocalPro",
    description: "Read the terms and conditions governing your use of LocalPro Marketplace.",
    url: `${APP_URL}/terms`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <PublicHeader />

      <main>
        <section className="bg-gradient-to-br from-white via-brand-50/30 to-primary-50/50">
          <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Legal</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0a2540] sm:text-5xl">
                Terms of Service
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                These Terms of Service govern your access to and use of the LocalPro platform, including our website, mobile applications, and related services.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <CalendarDays className="h-4 w-4 text-brand-700" />
                Last Updated: May 15, 2024
              </p>
            </div>
            <div className="hidden justify-center lg:flex">
              <div className="relative flex h-56 w-72 items-center justify-center rounded-[2rem] bg-brand-50">
                <div className="absolute left-8 top-6 h-40 w-32 rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
                  <div className="space-y-3 p-5">
                    <div className="h-2 rounded bg-slate-200" />
                    <div className="h-2 rounded bg-slate-200" />
                    <div className="h-2 w-2/3 rounded bg-slate-200" />
                    <div className="mt-8 h-2 rounded bg-slate-200" />
                    <div className="h-2 w-3/4 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="absolute bottom-8 right-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-xl ring-1 ring-slate-200">
                  <ShieldCheck className="h-11 w-11" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-site gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-4 text-sm font-extrabold text-[#0a2540]">On this page</h2>
              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      index === 0 ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50 hover:text-brand-700"
                    }`}
                  >
                    <span className="w-4 text-[11px]">{index + 1}.</span>
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-extrabold text-[#0a2540]">Questions about these terms?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you have any questions, please contact our support team.
              </p>
              <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                Contact Support
              </Link>
            </div>
          </aside>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <div className="prose prose-slate max-w-none space-y-8 prose-h2:text-[#0a2540] prose-p:text-slate-600 prose-li:text-slate-600">

          <section id="acceptance" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By registering for or using the LocalPro Marketplace (&ldquo;Platform&rdquo;) at <strong>localpro.asia</strong>,
              you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, please do not
              use the Platform. These Terms constitute a legally binding agreement between you and LocalPro.
            </p>
          </section>

          <section id="description" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro is an online marketplace that connects clients who need local services
              (e.g., plumbing, electrical work, cleaning) with service providers who offer those services.
              LocalPro is a platform intermediary only — we are not a party to any service agreement
              between clients and providers, and we do not employ service providers.
            </p>
          </section>

          <section id="eligibility" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. Eligibility</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>You must be at least 18 years old to register.</li>
              <li>You must be a resident of or operating within the Philippines.</li>
              <li>You must provide accurate and truthful registration information.</li>
              <li>One person may not maintain more than one active account without prior written approval from LocalPro.</li>
            </ul>
          </section>

          <section id="accounts" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. User Accounts</h2>
            <p className="text-slate-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activity that occurs under your account. Notify us immediately at <strong>support@localpro.asia</strong> if
              you suspect unauthorised access. LocalPro will not be liable for losses arising from unauthorised
              use of your account where you have failed to keep your credentials secure.
            </p>
          </section>

          <section id="payments" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Payments &amp; Escrow</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Payments are processed through <strong>PayMongo</strong>, a BSP-regulated payment gateway.</li>
              <li>When a client accepts a quote, the agreed amount is held in escrow until the job is marked complete.</li>
              <li>Funds are released to the provider upon client confirmation of job completion.</li>
              <li>LocalPro charges a platform commission on each completed transaction. The current commission rate is displayed during the quoting process.</li>
              <li>In the event of a dispute, LocalPro admin may apply a partial or full escrow refund at their discretion after reviewing evidence from both parties.</li>
              <li>Payouts to providers are processed within 3–5 business days of release confirmation.</li>
            </ul>
          </section>

          <section id="provider-terms" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Provider Obligations</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Providers must complete KYC (Know Your Customer) identity verification to become eligible for paid jobs.</li>
              <li>Providers must accurately represent their skills, qualifications, and experience.</li>
              <li>Providers must hold any licences or certifications required by Philippine law for the services they offer.</li>
              <li>Providers must maintain a professional standard of work and communicate promptly with clients.</li>
              <li>Providers must not solicit off-platform payments to circumvent LocalPro&apos;s escrow system.</li>
            </ul>
          </section>

          <section id="client-terms" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Client Obligations</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Clients must accurately describe the work required when posting a job.</li>
              <li>Clients must not post fraudulent, misleading, or illegal job requests.</li>
              <li>Clients must release escrow funds promptly once work has been satisfactorily completed.</li>
              <li>Clients must not attempt to solicit services outside the platform to avoid fees.</li>
            </ul>
          </section>

          <section id="conduct" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Prohibited Conduct</h2>
            <p className="text-slate-600 leading-relaxed mb-3">You must not:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Use the Platform for any unlawful purpose or in violation of Philippine law.</li>
              <li>Post false reviews, manipulate ratings, or impersonate another person.</li>
              <li>Harass, threaten, or abuse other users.</li>
              <li>Attempt to gain unauthorised access to any part of the Platform or other users&apos; accounts.</li>
              <li>Scrape, crawl, or systematically download Platform content without written permission.</li>
              <li>Upload malware, viruses, or any harmful code.</li>
              <li>Engage in money laundering, fraud, or any other financial crime through the Platform.</li>
            </ul>
          </section>

          <section id="disputes" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Dispute Resolution</h2>
            <p className="text-slate-600 leading-relaxed">
              Disputes between clients and providers should first be attempted to be resolved directly through
              the in-app messaging system. If unresolved, either party may raise a formal dispute through the
              Platform&apos;s dispute mechanism. LocalPro admin will review evidence submitted by both parties and
              issue a decision within 5 business days. LocalPro&apos;s decision on escrow allocation is final and
              binding on the platform.
            </p>
          </section>

          <section id="ip" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">10. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed">
              The LocalPro name, logo, and all Platform content created by LocalPro are the exclusive property
              of LocalPro and are protected by Philippine and international intellectual property law. You may
              not reproduce, distribute, or create derivative works without written permission. You retain
              ownership of content you upload (photos, descriptions) but grant LocalPro a non-exclusive,
              royalty-free licence to display and use that content to operate the Platform.
            </p>
          </section>

          <section id="liability" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">11. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              To the maximum extent permitted by Philippine law, LocalPro&apos;s total liability to you for any
              claim arising from or related to these Terms or your use of the Platform shall not exceed the
              total fees paid by you to LocalPro in the 3 months preceding the claim. LocalPro is not liable
              for the quality of work performed by providers, indirect damages, loss of profit, or losses
              arising from your use of or inability to use the Platform.
            </p>
          </section>

          <section id="termination" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">12. Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro reserves the right to suspend or permanently ban any account that violates these Terms,
              without prior notice in cases of serious misconduct, fraud, or legal obligation. You may close
              your account at any time provided there are no pending jobs or disputes. Outstanding escrow
              balances will be resolved before account closure.
            </p>
          </section>

          <section id="law" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">13. Governing Law</h2>
            <p className="text-slate-600 leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of the Republic of the
              Philippines. Any disputes shall be subject to the exclusive jurisdiction of the appropriate
              courts of Quezon City, Metro Manila, Philippines.
            </p>
          </section>

          <section id="changes" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">14. Changes to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              We may modify these Terms at any time. We will provide at least 7 days&apos; notice by email before
              material changes take effect. Continued use of the Platform after the effective date constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section id="contact" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">15. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about these Terms, contact:
            </p>
            <ul className="list-none mt-3 space-y-1 text-slate-600">
              <li>📧 <strong>support@localpro.asia</strong></li>
              <li>🌐 <strong>localpro.asia</strong></li>
            </ul>
          </section>
            </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">
            By using LocalPro, you acknowledge that you have read, understood, and agree to these Terms of Service.
          </p>
          <a href="#top" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
            <Printer className="h-4 w-4" />
            Print this page
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6 text-sm text-slate-400">
          <Link href="/privacy"            className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span className="text-slate-300">·</span>
          <Link href="/provider-agreement" className="hover:text-primary transition-colors">Provider Agreement</Link>
          <span className="text-slate-300">·</span>
          <Link href="/client-agreement"   className="hover:text-primary transition-colors">Client Agreement</Link>
          <span className="text-slate-300">·</span>
          <Link href="/escrow-policy"      className="hover:text-primary transition-colors">Escrow Policy</Link>
          <span className="text-slate-300">·</span>
          <Link href="/refund-policy"      className="hover:text-primary transition-colors">Refund Policy</Link>
          <span className="text-slate-300">·</span>
          <Link href="/dispute-resolution" className="hover:text-primary transition-colors">Dispute Resolution</Link>
          <span className="text-slate-300">·</span>
          <Link href="/"                   className="hover:text-primary transition-colors">Back to Home</Link>
        </div>
          </article>
        </section>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
