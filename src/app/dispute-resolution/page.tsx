import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Dispute Resolution Policy",
  description:
    "Learn how LocalPro handles disputes between clients and service providers, including the resolution process, timelines, and possible outcomes.",
  alternates: { canonical: `${APP_URL}/dispute-resolution` },
  openGraph: {
    title: "Dispute Resolution Policy | LocalPro",
    description: "Learn how LocalPro resolves disputes between clients and service providers.",
    url: `${APP_URL}/dispute-resolution`,
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

export default function DisputeResolutionPage() {
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
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Dispute Resolution Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: March 15, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Purpose</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro&apos;s dispute resolution process exists to fairly and transparently resolve disagreements
              between clients and service providers that cannot be resolved between the parties themselves.
              This policy describes when a dispute can be raised, how LocalPro investigates it, what outcomes
              are possible, and the finality of decisions. All parties agree to abide by this process as a
              condition of using the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. When a Dispute Can Be Raised</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              A client may raise a dispute in any of the following situations:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>The provider has marked the job as &ldquo;Complete&rdquo; but the client believes the work was not completed, is of unacceptable quality, or does not match the agreed scope.</li>
              <li>The provider abandoned the job without completing the agreed work.</li>
              <li>The provider failed to show up on the scheduled date and has not communicated.</li>
              <li>There is a disagreement about the agreed scope or payment amount.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              <strong>Time limit:</strong> Disputes must be raised within <strong>7 calendar days</strong> of
              the provider marking the job as &ldquo;Complete&rdquo;. After this window, the escrow funds are
              automatically released to the provider and the transaction is final.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. How to Raise a Dispute</h2>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Log in to your LocalPro account and navigate to the relevant job in your dashboard.</li>
              <li>Click the &ldquo;Raise Dispute&rdquo; button (visible once the provider marks the job complete, and before you release payment).</li>
              <li>Select the reason for the dispute from the dropdown and provide a clear written description of the issue.</li>
              <li>Attach supporting evidence where possible — photographs, screenshots of messages between you and the provider, videos, or other documentation.</li>
              <li>Submit the dispute. You will receive a confirmation notification and your case reference number.</li>
            </ol>
            <p className="text-slate-600 leading-relaxed mt-3">
              Alternatively, contact <strong>support@localpro.asia</strong> with your job ID and dispute details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Escrow Freeze During Dispute</h2>
            <p className="text-slate-600 leading-relaxed">
              Once a dispute is raised, the escrow funds for that job are immediately frozen. Neither the
              client nor the provider can access the funds until the dispute is resolved. This protects both
              parties while the review is in progress. The auto-release timer is also paused for the duration
              of the dispute review.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Investigation Process</h2>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Acknowledgement</strong> — LocalPro will acknowledge receipt of the dispute within 1 business day and notify the provider.</li>
              <li><strong>Provider response</strong> — The provider has <strong>48 hours</strong> to respond to the dispute by providing their account of events and any supporting evidence (e.g., photos of completed work, job completion sign-off, messages).</li>
              <li><strong>Review</strong> — A LocalPro staff member reviews all submitted evidence from both parties. We may ask either party for additional information.</li>
              <li><strong>Decision</strong> — LocalPro will issue a ruling within <strong>5–10 business days</strong> from the date the dispute was raised. Complex cases may take longer; we will notify both parties of any extension.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Possible Outcomes</h2>
            <p className="text-slate-600 leading-relaxed mb-3">Based on the evidence reviewed, LocalPro may rule as follows:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Full refund to client</strong> — Escrow is returned to the client in full (less the non-refundable platform service fee) if the provider clearly failed to complete the job or engaged in fraud.</li>
              <li><strong>Partial refund to client / partial release to provider</strong> — Where work was partially completed to the agreed standard, LocalPro splits the escrow proportionally based on the assessed completion percentage.</li>
              <li><strong>Full release to provider</strong> — Escrow is released in full to the provider if LocalPro determines the work was completed to the agreed standard and the dispute is not upheld.</li>
              <li><strong>Mutual agreement</strong> — LocalPro may facilitate a negotiated settlement between parties if both agree to revised terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Communication Standards During Disputes</h2>
            <p className="text-slate-600 leading-relaxed">
              Both parties must communicate professionally and honestly throughout the dispute process.
              The following are grounds for an immediate ruling against a party:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed mt-3">
              <li>Submitting fabricated or altered evidence.</li>
              <li>Threatening, harassing, or attempting to coerce the other party or LocalPro staff.</li>
              <li>Refusing to participate in the review process without reasonable cause.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Finality of Decisions</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro&apos;s dispute ruling is <strong>final and binding</strong>. LocalPro does not offer an
              internal appeals process. If you believe a decision was made in error due to procedural
              irregularity (e.g., your evidence was not considered), you may contact{" "}
              <strong>support@localpro.asia</strong> within 5 days of the ruling to request a review.
              Such review requests are evaluated at LocalPro&apos;s sole discretion and do not automatically
              trigger a re-investigation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Provider-Initiated Disputes</h2>
            <p className="text-slate-600 leading-relaxed">
              While the dispute-raising mechanism is primarily designed for clients (since clients hold the
              release trigger), a provider who believes a client is wrongfully withholding payment after
              work is complete may contact <strong>support@localpro.asia</strong> to initiate a review.
              LocalPro will assess the situation and, if appropriate, initiate an admin-triggered dispute
              review on the provider&apos;s behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">10. Repeated or Fraudulent Disputes</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro monitors dispute patterns. Clients who repeatedly file frivolous, false, or bad-faith
              disputes against providers may have their accounts suspended or permanently terminated. Providers
              found to be delivering consistently substandard work that generates disputes may have their
              accounts reviewed, demoted in search rankings, or permanently banned.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">11. Governing Law</h2>
            <p className="text-slate-600 leading-relaxed">
              This Policy is governed by the laws of the Republic of the Philippines. By using the Platform
              and entering an escrow-protected transaction, both parties agree that LocalPro&apos;s dispute
              resolution findings constitute a civil settlement between the parties for the amount disputed,
              and it is the responsibility of both parties to comply with the outcome.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">12. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              To raise or inquire about a dispute:
            </p>
            <ul className="list-none mt-3 space-y-1 text-slate-600">
              <li>📧 <strong>support@localpro.asia</strong></li>
              <li>🌐 <strong>localpro.asia</strong></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {LEGAL_LINKS.filter((l) => l.href !== "/dispute-resolution").map((l, i, arr) => (
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
