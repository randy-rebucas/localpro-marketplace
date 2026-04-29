import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "purpose", title: "Purpose" },
  { id: "when", title: "When a Dispute Can Be Raised" },
  { id: "raise", title: "How to Raise a Dispute" },
  { id: "freeze", title: "Escrow Freeze During Dispute" },
  { id: "investigation", title: "Investigation Process" },
  { id: "outcomes", title: "Possible Outcomes" },
  { id: "communication", title: "Communication Standards During Disputes" },
  { id: "finality", title: "Finality of Decisions" },
  { id: "provider-initiated", title: "Provider-Initiated Disputes" },
  { id: "repeated", title: "Repeated or Fraudulent Disputes" },
  { id: "law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
];

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

export default function DisputeResolutionPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <PublicHeader />

      <main>
        <section className="bg-gradient-to-br from-white via-brand-50/30 to-primary-50/50">
          <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Legal</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0a2540] sm:text-5xl">
                Dispute Resolution Policy
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                How LocalPro reviews disagreements between clients and providers, freezes escrow while a case is open,
                and what to expect for timelines and outcomes.
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
              <h2 className="text-sm font-extrabold text-[#0a2540]">Questions about a dispute?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Contact support with your job ID and case reference if you need help with an open or closed review.
              </p>
              <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                Contact Support
              </Link>
            </div>
          </aside>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <div className="prose prose-slate max-w-none space-y-8 prose-h2:text-[#0a2540] prose-p:text-slate-600 prose-li:text-slate-600">
              <section id="purpose" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">1. Purpose</h2>
                <p className="text-slate-600 leading-relaxed">
                  LocalPro&apos;s dispute resolution process exists to fairly and transparently resolve disagreements
                  between clients and service providers that cannot be resolved between the parties themselves.
                  This policy describes when a dispute can be raised, how LocalPro investigates it, what outcomes
                  are possible, and the finality of decisions. All parties agree to abide by this process as a
                  condition of using the Platform.
                </p>
              </section>

              <section id="when" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">2. When a Dispute Can Be Raised</h2>
                <p className="text-slate-600 leading-relaxed mb-3">A client may raise a dispute in any of the following situations:</p>
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

              <section id="raise" className="scroll-mt-28">
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

              <section id="freeze" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">4. Escrow Freeze During Dispute</h2>
                <p className="text-slate-600 leading-relaxed">
                  Once a dispute is raised, the escrow funds for that job are immediately frozen. Neither the
                  client nor the provider can access the funds until the dispute is resolved. This protects both
                  parties while the review is in progress. The auto-release timer is also paused for the duration
                  of the dispute review.
                </p>
              </section>

              <section id="investigation" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">5. Investigation Process</h2>
                <ol className="list-decimal pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li><strong>Acknowledgement</strong> — LocalPro will acknowledge receipt of the dispute within 1 business day and notify the provider.</li>
                  <li><strong>Provider response</strong> — The provider has <strong>48 hours</strong> to respond to the dispute by providing their account of events and any supporting evidence (e.g., photos of completed work, job completion sign-off, messages).</li>
                  <li><strong>Review</strong> — A LocalPro staff member reviews all submitted evidence from both parties. We may ask either party for additional information.</li>
                  <li><strong>Decision</strong> — LocalPro will issue a ruling within <strong>5–10 business days</strong> from the date the dispute was raised. Complex cases may take longer; we will notify both parties of any extension.</li>
                </ol>
              </section>

              <section id="outcomes" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">6. Possible Outcomes</h2>
                <p className="text-slate-600 leading-relaxed mb-3">Based on the evidence reviewed, LocalPro may rule as follows:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li><strong>Full refund to client</strong> — Escrow is returned to the client in full (less the non-refundable platform service fee) if the provider clearly failed to complete the job or engaged in fraud.</li>
                  <li><strong>Partial refund to client / partial release to provider</strong> — Where work was partially completed to the agreed standard, LocalPro splits the escrow proportionally based on the assessed completion percentage.</li>
                  <li><strong>Full release to provider</strong> — Escrow is released in full to the provider if LocalPro determines the work was completed to the agreed standard and the dispute is not upheld.</li>
                  <li><strong>Mutual agreement</strong> — LocalPro may facilitate a negotiated settlement between parties if both agree to revised terms.</li>
                </ul>
              </section>

              <section id="communication" className="scroll-mt-28">
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

              <section id="finality" className="scroll-mt-28">
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

              <section id="provider-initiated" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">9. Provider-Initiated Disputes</h2>
                <p className="text-slate-600 leading-relaxed">
                  While the dispute-raising mechanism is primarily designed for clients (since clients hold the
                  release trigger), a provider who believes a client is wrongfully withholding payment after
                  work is complete may contact <strong>support@localpro.asia</strong> to initiate a review.
                  LocalPro will assess the situation and, if appropriate, initiate an admin-triggered dispute
                  review on the provider&apos;s behalf.
                </p>
              </section>

              <section id="repeated" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">10. Repeated or Fraudulent Disputes</h2>
                <p className="text-slate-600 leading-relaxed">
                  LocalPro monitors dispute patterns. Clients who repeatedly file frivolous, false, or bad-faith
                  disputes against providers may have their accounts suspended or permanently terminated. Providers
                  found to be delivering consistently substandard work that generates disputes may have their
                  accounts reviewed, demoted in search rankings, or permanently banned.
                </p>
              </section>

              <section id="law" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">11. Governing Law</h2>
                <p className="text-slate-600 leading-relaxed">
                  This Policy is governed by the laws of the Republic of the Philippines. By using the Platform
                  and entering an escrow-protected transaction, both parties agree that LocalPro&apos;s dispute
                  resolution findings constitute a civil settlement between the parties for the amount disputed,
                  and it is the responsibility of both parties to comply with the outcome.
                </p>
              </section>

              <section id="contact" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">12. Contact</h2>
                <p className="text-slate-600 leading-relaxed">To raise or inquire about a dispute:</p>
                <ul className="list-none mt-3 space-y-1 text-slate-600">
                  <li>📧 <strong>support@localpro.asia</strong></li>
                  <li>🌐 <strong>localpro.asia</strong></li>
                </ul>
              </section>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-600">
                By using LocalPro, you agree to participate in this dispute resolution process in good faith as a condition of using the Platform.
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
