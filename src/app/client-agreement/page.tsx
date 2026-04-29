import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "about", title: "About This Agreement" },
  { id: "eligibility", title: "Eligibility & Registration" },
  { id: "posting-jobs", title: "Posting Jobs" },
  { id: "hiring", title: "Accepting Bids & Hiring Providers" },
  { id: "payments", title: "Payments & Escrow" },
  { id: "releasing", title: "Releasing Escrow Funds" },
  { id: "prohibited", title: "Prohibited Conduct" },
  { id: "disputes", title: "Disputes" },
  { id: "cancellations", title: "Cancellations" },
  { id: "suspension", title: "Account Suspension & Termination" },
  { id: "law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
];

export const metadata: Metadata = {
  title: "Client Agreement",
  description:
    "Read the Client Agreement governing individuals and businesses who post jobs and hire service professionals on the LocalPro Marketplace platform.",
  alternates: { canonical: `${APP_URL}/client-agreement` },
  openGraph: {
    title: "Client Agreement | LocalPro",
    description: "Read the Client Agreement for hiring service professionals on LocalPro Marketplace.",
    url: `${APP_URL}/client-agreement`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function ClientAgreementPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <PublicHeader />

      <main>
        <section className="bg-gradient-to-br from-white via-brand-50/30 to-primary-50/50">
          <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Legal</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0a2540] sm:text-5xl">Client Agreement</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                This agreement sets out the rules for clients who post jobs and hire verified professionals through
                LocalPro. It works together with our Terms of Service and Privacy Policy.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <CalendarDays className="h-4 w-4 text-brand-700" />
                Last Updated: March 15, 2026
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
                    <span className="w-4 shrink-0 text-[11px]">{index + 1}.</span>
                    <span className="min-w-0 leading-snug">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-extrabold text-[#0a2540]">Questions about this agreement?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Our team can help clarify how these terms apply to your account or jobs.
              </p>
              <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                Contact Support
              </Link>
            </div>
          </aside>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <div className="prose prose-slate max-w-none space-y-8 prose-h2:text-[#0a2540] prose-p:text-slate-600 prose-li:text-slate-600">
              <section id="about" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">1. About This Agreement</h2>
                <p className="text-slate-600 leading-relaxed">
                  This Client Agreement (&ldquo;Agreement&rdquo;) is a legally binding contract between you
                  (&ldquo;Client&rdquo;) and LocalPro governing your access to and use of the LocalPro Marketplace
                  platform (&ldquo;Platform&rdquo;) as someone who posts jobs and hires service providers. By
                  registering as a client, you accept this Agreement in full. This Agreement supplements and should
                  be read together with our{" "}
                  <Link href="/terms" className="text-primary underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </section>

              <section id="eligibility" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">2. Eligibility &amp; Registration</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>You must be at least 18 years old and legally capable of entering into a binding contract.</li>
                  <li>Business clients must be duly registered entities operating within the Philippines.</li>
                  <li>You must provide accurate registration information including your name, email address, and contact number.</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</li>
                </ul>
              </section>

              <section id="posting-jobs" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">3. Posting Jobs</h2>
                <p className="text-slate-600 leading-relaxed mb-3">When posting a job on the Platform, you agree to:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Describe the work required accurately, completely, and honestly — including the scope, timeline, location, and any special requirements.</li>
                  <li>Not post jobs for services that are illegal, dangerous, or otherwise prohibited under Philippine law or LocalPro&apos;s policies.</li>
                  <li>Not post fake, test, or duplicate job listings intended to spam or deceive providers.</li>
                  <li>Not use job listings as a means to solicit provider contact information for purposes unrelated to the posted job.</li>
                  <li>Set a realistic budget that reflects fair compensation for the described work.</li>
                </ul>
              </section>

              <section id="hiring" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">4. Accepting Bids &amp; Hiring Providers</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Reviewing and accepting a provider&apos;s bid constitutes a binding service contract between you and that provider.</li>
                  <li>LocalPro is not a party to the service contract between you and a provider. LocalPro acts solely as the Platform intermediary and payment escrow agent.</li>
                  <li>You are encouraged to review provider profiles, ratings, and KYC verification status before accepting a bid.</li>
                  <li>Once you accept a bid, the KYC-verified provider will be assigned to your job. Changing your mind after acceptance may result in a cancellation fee depending on the job status.</li>
                </ul>
              </section>

              <section id="payments" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">5. Payments &amp; Escrow</h2>
                <p className="text-slate-600 leading-relaxed mb-3">All payments on LocalPro are made through our escrow system to protect both clients and providers:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Before work begins, you fund the escrow account with the agreed job amount. Funds are held securely by LocalPro and are not released to the provider until you confirm completion or the auto-release period expires.</li>
                  <li>Payment methods include credit/debit cards and e-wallets via our payment processors (PayMongo, PayPal). All transactions are processed in Philippine Peso (PHP) unless otherwise specified.</li>
                  <li>A platform service fee is added to the job amount at checkout. This fee is displayed clearly before you confirm payment and is non-refundable once payment is processed.</li>
                  <li>
                    See our{" "}
                    <Link href="/escrow-policy" className="text-primary underline">
                      Escrow Policy
                    </Link>{" "}
                    for full details on how funds are held, released, and refunded.
                  </li>
                </ul>
              </section>

              <section id="releasing" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">6. Releasing Escrow Funds</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>You must release escrow funds promptly once you are satisfied that the work has been completed to the agreed standard.</li>
                  <li>If you do not release funds or raise a dispute within 7 days of the provider marking the job as complete, funds will be automatically released to the provider.</li>
                  <li>You may release partial payments for milestone-based jobs as each milestone is satisfactorily completed.</li>
                  <li>Withholding funds without valid reason or using the release mechanism as leverage against a provider is a violation of this Agreement.</li>
                </ul>
              </section>

              <section id="prohibited" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">7. Prohibited Conduct</h2>
                <p className="text-slate-600 leading-relaxed mb-3">As a Client you must not:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Attempt to communicate with or pay a provider directly outside the Platform to circumvent LocalPro&apos;s escrow or commission structure.</li>
                  <li>Submit false, exaggerated, or malicious dispute claims against a provider.</li>
                  <li>Post fake reviews or manipulate the rating system in any way.</li>
                  <li>Harass, threaten, discriminate against, or abuse any provider or LocalPro staff member.</li>
                  <li>Share or misuse provider personal information (contact numbers, addresses) obtained through the Platform for any purpose beyond the scope of the hired job.</li>
                </ul>
              </section>

              <section id="disputes" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">8. Disputes</h2>
                <p className="text-slate-600 leading-relaxed">
                  If you are unsatisfied with the work completed, you may raise a dispute within 7 days of the
                  provider marking the job complete (see{" "}
                  <Link href="/dispute-resolution" className="text-primary underline">
                    Dispute Resolution Policy
                  </Link>
                  ). During the dispute period, escrow funds are held by LocalPro pending review. LocalPro&apos;s
                  decision on disputes is final. Refunds, if granted, are processed in accordance with our{" "}
                  <Link href="/refund-policy" className="text-primary underline">
                    Refund Policy
                  </Link>
                  .
                </p>
              </section>

              <section id="cancellations" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">9. Cancellations</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>If you cancel a job before a provider&apos;s bid is accepted, no charge is incurred (the job listing is simply closed).</li>
                  <li>If you cancel after accepting a bid but before work starts, you may be eligible for a full escrow refund minus the platform service fee, subject to LocalPro&apos;s review.</li>
                  <li>If you cancel after work has commenced, a partial refund may be granted based on the proportion of work completed, as determined by LocalPro.</li>
                  <li>Repeated or abusive cancellations may result in restrictions on your account.</li>
                </ul>
              </section>

              <section id="suspension" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">10. Account Suspension &amp; Termination</h2>
                <p className="text-slate-600 leading-relaxed">
                  LocalPro may suspend or terminate a client account for fraud, repeated policy violations,
                  chargeback abuse, harassment, or any conduct that harms providers, other clients, or the
                  integrity of the Platform. Suspended accounts may have pending escrow funds held for
                  investigation. Terminated accounts are not entitled to any promotional credits or discounts.
                </p>
              </section>

              <section id="law" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">11. Governing Law</h2>
                <p className="text-slate-600 leading-relaxed">
                  This Agreement is governed by the laws of the Republic of the Philippines. Any disputes arising
                  from this Agreement shall be subject to the exclusive jurisdiction of the appropriate courts of
                  Quezon City, Metro Manila, Philippines.
                </p>
              </section>

              <section id="contact" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">12. Contact</h2>
                <p className="text-slate-600 leading-relaxed">For questions regarding this Agreement:</p>
                <ul className="list-none mt-3 space-y-1 text-slate-600">
                  <li>📧 <strong>support@localpro.asia</strong></li>
                  <li>🌐 <strong>localpro.asia</strong></li>
                </ul>
              </section>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-600">
                By hiring through LocalPro as a client, you acknowledge that you have read, understood, and agree to this Client Agreement.
              </p>
              <a href="#top" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                <Printer className="h-4 w-4" />
                Print this page
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6 text-sm text-slate-400">
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/provider-agreement" className="hover:text-primary transition-colors">
                Provider Agreement
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/client-agreement" className="hover:text-primary transition-colors">
                Client Agreement
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/escrow-policy" className="hover:text-primary transition-colors">
                Escrow Policy
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/refund-policy" className="hover:text-primary transition-colors">
                Refund Policy
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/dispute-resolution" className="hover:text-primary transition-colors">
                Dispute Resolution
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/" className="hover:text-primary transition-colors">
                Back to Home
              </Link>
            </div>
          </article>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
