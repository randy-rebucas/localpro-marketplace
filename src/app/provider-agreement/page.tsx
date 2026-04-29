import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "about", title: "About This Agreement" },
  { id: "eligibility", title: "Eligibility & Registration" },
  { id: "kyc", title: "KYC Verification" },
  { id: "conduct", title: "Platform Conduct" },
  { id: "bids", title: "Bids & Job Acceptance" },
  { id: "payments", title: "Payments & Commission" },
  { id: "taxes", title: "Taxes & Legal Compliance" },
  { id: "contractor", title: "Independent Contractor Status" },
  { id: "disputes", title: "Disputes With Clients" },
  { id: "suspension", title: "Account Suspension & Termination" },
  { id: "law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
];

export const metadata: Metadata = {
  title: "Provider Agreement",
  description:
    "Read the Provider Agreement governing service professionals who offer their services on the LocalPro Marketplace platform in the Philippines.",
  alternates: { canonical: `${APP_URL}/provider-agreement` },
  openGraph: {
    title: "Provider Agreement | LocalPro",
    description: "Read the Provider Agreement for service professionals on LocalPro Marketplace.",
    url: `${APP_URL}/provider-agreement`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function ProviderAgreementPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <PublicHeader />

      <main>
        <section className="bg-gradient-to-br from-white via-brand-50/30 to-primary-50/50">
          <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Legal</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0a2540] sm:text-5xl">Provider Agreement</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                This agreement explains how service professionals use LocalPro to find work, get paid through escrow,
                and stay compliant. Read it together with our Terms of Service and Privacy Policy.
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
                Our team can help with payouts, KYC, or how policies apply to your pro account.
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
                  This Provider Agreement (&ldquo;Agreement&rdquo;) is a legally binding contract between you
                  (&ldquo;Provider&rdquo;) and LocalPro (&ldquo;LocalPro&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
                  governing your access to and use of the LocalPro Marketplace platform (&ldquo;Platform&rdquo;) as
                  a service provider. By registering as a provider, you accept this Agreement in full. This
                  Agreement supplements and should be read together with our{" "}
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
                  <li>You must be at least 18 years old and a resident of or operating within the Philippines.</li>
                  <li>You must provide accurate personal information including your full legal name, valid government-issued ID, and contact details.</li>
                  <li>You must successfully complete LocalPro&apos;s KYC (Know Your Customer) identity verification before receiving payment for any job.</li>
                  <li>You must hold all licences, permits, certifications, and insurance required by Philippine law for the services you intend to offer.</li>
                  <li>Persons who have been suspended or permanently banned from the Platform may not register a new account without prior written approval from LocalPro.</li>
                </ul>
              </section>

              <section id="kyc" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">3. KYC Verification</h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  To protect clients and maintain trust, all providers must complete identity verification before
                  withdrawing earnings:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Submit a clear photo of a valid Philippine government-issued ID (e.g., PhilSys, UMID, Passport, Driver&apos;s Licence, SSS, PRC ID).</li>
                  <li>Submit a selfie holding your ID.</li>
                  <li>KYC documents are reviewed by LocalPro within 1–3 business days.</li>
                  <li>Approval or rejection decisions are final at LocalPro&apos;s sole discretion. You may re-apply with corrected documents if rejected.</li>
                  <li>LocalPro retains KYC documents only for the duration necessary for verification and deletes them within 30 days of a completed review, in compliance with the Data Privacy Act of 2012.</li>
                </ul>
              </section>

              <section id="conduct" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">4. Platform Conduct</h2>
                <p className="text-slate-600 leading-relaxed mb-3">As a Provider you agree to:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Represent your skills, qualifications, experience, and credentials accurately and honestly.</li>
                  <li>Respond to client messages within a reasonable time and maintain professional communication at all times.</li>
                  <li>Perform work to the standard described in your accepted bid and agreed Service Agreement with the client.</li>
                  <li>Show up on time and, if unable to fulfil a commitment, notify the client and LocalPro support immediately.</li>
                  <li>Not solicit payments directly from clients outside the Platform&apos;s escrow system to avoid Platform fees.</li>
                  <li>Not engage in discriminatory, harassing, threatening, or abusive behaviour toward clients, other providers, or LocalPro staff.</li>
                  <li>Not manipulate the review or rating system, including by offering incentives for positive reviews.</li>
                </ul>
              </section>

              <section id="bids" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">5. Bids &amp; Job Acceptance</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Submitting a bid constitutes a binding offer to perform the described work at the stated price if accepted by the client.</li>
                  <li>You may withdraw a bid before the client accepts it without penalty.</li>
                  <li>Once a client accepts your bid, a job contract is formed between you and the client. Cancellation after acceptance may result in a negative impact on your account standing.</li>
                  <li>Bid credits, if applicable, are consumed upon bid submission and are non-refundable.</li>
                </ul>
              </section>

              <section id="payments" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">6. Payments &amp; Commission</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Clients pay into escrow before work begins. Funds are held securely by LocalPro until the job is completed.</li>
                  <li>Upon the client releasing the escrow funds, LocalPro deducts its service commission (the current rate is displayed in your dashboard and is subject to change with 7 days&apos; notice) before crediting your earnings wallet.</li>
                  <li>Earnings are credited to your in-platform wallet and may be withdrawn to your bank account or GCash once your minimum withdrawal threshold is met and KYC is verified.</li>
                  <li>Withdrawal processing times are typically 1–3 business days. LocalPro is not responsible for delays caused by third-party payment processors.</li>
                  <li>LocalPro reserves the right to withhold funds pending investigation of fraud, chargebacks, or disputes.</li>
                </ul>
              </section>

              <section id="taxes" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">7. Taxes &amp; Legal Compliance</h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  You are solely responsible for your own tax obligations arising from income earned through the
                  Platform. Specifically:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>You must register with the Bureau of Internal Revenue (BIR) and file all required income tax returns as required by Philippine law.</li>
                  <li>Depending on your gross annual receipts, you may be required to register as a VAT or percentage tax payer.</li>
                  <li>LocalPro may issue a Certificate of Withholding Tax if required by regulation. Responsibility for proper filing remains yours.</li>
                  <li>LocalPro does not provide tax advice. Consult a licensed CPA or tax professional for guidance specific to your situation.</li>
                </ul>
              </section>

              <section id="contractor" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">8. Independent Contractor Status</h2>
                <p className="text-slate-600 leading-relaxed">
                  You are an independent contractor and not an employee, agent, partner, or joint venturer of
                  LocalPro. You have no authority to bind LocalPro in any agreement. LocalPro does not control
                  the manner or means by which you perform services for clients. You are solely responsible for
                  all tools, equipment, and safety compliance required for your work.
                </p>
              </section>

              <section id="disputes" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">9. Disputes With Clients</h2>
                <p className="text-slate-600 leading-relaxed">
                  If a client raises a dispute regarding your work, LocalPro will conduct a review in accordance
                  with the{" "}
                  <Link href="/dispute-resolution" className="text-primary underline">
                    Dispute Resolution Policy
                  </Link>
                  . You must cooperate fully, provide evidence of work completed, and respond to LocalPro within
                  the timelines specified. Outcomes may include full or partial payment to you or a refund to the
                  client, at LocalPro&apos;s sole discretion.
                </p>
              </section>

              <section id="suspension" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">10. Account Suspension &amp; Termination</h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  LocalPro may suspend or permanently terminate a provider account for any of the following reasons:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>Fraudulent, deceptive, or illegal conduct.</li>
                  <li>Repeated negative reviews or unresolved disputes.</li>
                  <li>KYC fraud or submission of falsified documents.</li>
                  <li>Violation of this Agreement, the Terms of Service, or any applicable Philippine law.</li>
                  <li>Off-platform solicitation of clients to bypass escrow.</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-3">
                  Suspended accounts will have outstanding payments held pending investigation. Permanently
                  terminated accounts forfeit any bid credits or promotional credits.
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
                By offering services on LocalPro as a provider, you acknowledge that you have read, understood, and agree to this Provider Agreement.
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
