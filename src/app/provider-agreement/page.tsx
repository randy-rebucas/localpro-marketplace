import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Provider Agreement",
  description:
    "Read the Provider Agreement governing service professionals who offer their services on the LocalPro Marketplace platform in the Philippines.",
  alternates: { canonical: `${APP_URL}/provider-agreement` },
  openGraph: {
    title: "Provider Agreement | LocalPro",
    description:
      "Read the Provider Agreement for service professionals on LocalPro Marketplace.",
    url: `${APP_URL}/provider-agreement`,
    siteName: "LocalPro",
    type: "website",
  },
};

const LEGAL_LINKS = [
  { href: "/terms",               label: "Terms of Service" },
  { href: "/privacy",             label: "Privacy Policy" },
  { href: "/provider-agreement",  label: "Provider Agreement" },
  { href: "/client-agreement",    label: "Client Agreement" },
  { href: "/escrow-policy",       label: "Escrow Policy" },
  { href: "/refund-policy",       label: "Refund Policy" },
  { href: "/dispute-resolution",  label: "Dispute Resolution" },
];

export default function ProviderAgreementPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold">
              <span className="text-primary">Local</span>
              <span className="text-brand">Pro</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Provider Agreement</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: March 15, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. About This Agreement</h2>
            <p className="text-slate-600 leading-relaxed">
              This Provider Agreement (&ldquo;Agreement&rdquo;) is a legally binding contract between you
              (&ldquo;Provider&rdquo;) and LocalPro (&ldquo;LocalPro&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
              governing your access to and use of the LocalPro Marketplace platform (&ldquo;Platform&rdquo;) as
              a service provider. By registering as a provider, you accept this Agreement in full. This
              Agreement supplements and should be read together with our{" "}
              <Link href="/terms" className="text-primary underline">Terms of Service</Link>{" "}and{" "}
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. Eligibility &amp; Registration</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>You must be at least 18 years old and a resident of or operating within the Philippines.</li>
              <li>You must provide accurate personal information including your full legal name, valid government-issued ID, and contact details.</li>
              <li>You must successfully complete LocalPro&apos;s KYC (Know Your Customer) identity verification before receiving payment for any job.</li>
              <li>You must hold all licences, permits, certifications, and insurance required by Philippine law for the services you intend to offer.</li>
              <li>Persons who have been suspended or permanently banned from the Platform may not register a new account without prior written approval from LocalPro.</li>
            </ul>
          </section>

          <section>
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

          <section>
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

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Bids &amp; Job Acceptance</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Submitting a bid constitutes a binding offer to perform the described work at the stated price if accepted by the client.</li>
              <li>You may withdraw a bid before the client accepts it without penalty.</li>
              <li>Once a client accepts your bid, a job contract is formed between you and the client. Cancellation after acceptance may result in a negative impact on your account standing.</li>
              <li>Bid credits, if applicable, are consumed upon bid submission and are non-refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Payments &amp; Commission</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Clients pay into escrow before work begins. Funds are held securely by LocalPro until the job is completed.</li>
              <li>Upon the client releasing the escrow funds, LocalPro deducts its service commission (the current rate is displayed in your dashboard and is subject to change with 7 days&apos; notice) before crediting your earnings wallet.</li>
              <li>Earnings are credited to your in-platform wallet and may be withdrawn to your bank account or GCash once your minimum withdrawal threshold is met and KYC is verified.</li>
              <li>Withdrawal processing times are typically 1–3 business days. LocalPro is not responsible for delays caused by third-party payment processors.</li>
              <li>LocalPro reserves the right to withhold funds pending investigation of fraud, chargebacks, or disputes.</li>
            </ul>
          </section>

          <section>
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

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Independent Contractor Status</h2>
            <p className="text-slate-600 leading-relaxed">
              You are an independent contractor and not an employee, agent, partner, or joint venturer of
              LocalPro. You have no authority to bind LocalPro in any agreement. LocalPro does not control
              the manner or means by which you perform services for clients. You are solely responsible for
              all tools, equipment, and safety compliance required for your work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Disputes With Clients</h2>
            <p className="text-slate-600 leading-relaxed">
              If a client raises a dispute regarding your work, LocalPro will conduct a review in accordance
              with the{" "}
              <Link href="/dispute-resolution" className="text-primary underline">Dispute Resolution Policy</Link>.
              You must cooperate fully, provide evidence of work completed, and respond to LocalPro within
              the timelines specified. Outcomes may include full or partial payment to you or a refund to the
              client, at LocalPro&apos;s sole discretion.
            </p>
          </section>

          <section>
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

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">11. Governing Law</h2>
            <p className="text-slate-600 leading-relaxed">
              This Agreement is governed by the laws of the Republic of the Philippines. Any disputes arising
              from this Agreement shall be subject to the exclusive jurisdiction of the appropriate courts of
              Quezon City, Metro Manila, Philippines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">12. Contact</h2>
            <p className="text-slate-600 leading-relaxed">For questions regarding this Agreement:</p>
            <ul className="list-none mt-3 space-y-1 text-slate-600">
              <li>📧 <strong>support@localpro.asia</strong></li>
              <li>🌐 <strong>localpro.asia</strong></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {LEGAL_LINKS.filter((l) => l.href !== "/provider-agreement").map((l, i, arr) => (
            <React.Fragment key={l.href}>
              <Link href={l.href} className="hover:text-primary transition-colors">{l.label}</Link>
              {i < arr.length - 1 && <span className="text-slate-300">·</span>}
            </React.Fragment>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs leading-none">LP</span>
            </div>
            <span className="text-sm font-bold">
              <span className="text-primary-300">Local</span>
              <span className="text-brand-400">Pro</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs">© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
