import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "overview", title: "Overview" },
  { id: "eligible", title: "When You Are Eligible for a Refund" },
  { id: "non-refundable", title: "Non-Refundable Fees" },
  { id: "not-issued", title: "When Refunds Are NOT Issued" },
  { id: "request", title: "How to Request a Refund" },
  { id: "timeline", title: "Refund Processing Timeline" },
  { id: "chargebacks", title: "Chargebacks" },
  { id: "contact", title: "Contact" },
];

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Learn when and how LocalPro processes refunds for clients, including cancellation refunds, dispute outcomes, and non-refundable fees.",
  alternates: { canonical: `${APP_URL}/refund-policy` },
  openGraph: {
    title: "Refund Policy | LocalPro",
    description: "Learn when and how LocalPro processes refunds for clients on the Marketplace.",
    url: `${APP_URL}/refund-policy`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function RefundPolicyPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <PublicHeader />

      <main>
        <section className="bg-gradient-to-br from-white via-brand-50/30 to-primary-50/50">
          <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Legal</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0a2540] sm:text-5xl">Refund Policy</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                When escrow funds can be returned to clients, what fees are non-refundable, how to request a refund,
                and how long processing typically takes on LocalPro.
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
              <h2 className="text-sm font-extrabold text-[#0a2540]">Questions about refunds?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you need help with a specific job or payment, contact support with your job ID and details.
              </p>
              <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                Contact Support
              </Link>
            </div>
          </aside>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <div className="prose prose-slate max-w-none space-y-8 prose-h2:text-[#0a2540] prose-h3:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
              <section id="overview" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">1. Overview</h2>
                <p className="text-slate-600 leading-relaxed">
                  LocalPro uses an escrow system to protect clients and providers. Refunds relate exclusively to
                  funds held in escrow — they are not applicable to fees charged by LocalPro for platform access,
                  bid credits, featured listing upgrades, or training enrolments unless stated otherwise. This
                  policy explains when escrow refunds are issued, the process for requesting one, and timelines
                  for processing.
                </p>
              </section>

              <section id="eligible" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">2. When You Are Eligible for a Refund</h2>
                <p className="text-slate-600 leading-relaxed mb-3">
                  A full or partial refund of the escrowed job amount (excluding the platform service fee) may
                  be issued in the following situations:
                </p>

                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2a. Cancellation Before Work Starts</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>If you cancel the job after funding escrow but before the provider has started work, you are eligible for a full refund of the escrowed job amount.</li>
                  <li>The non-refundable platform service fee will not be returned.</li>
                  <li>Cancellation must be made by contacting support or using the in-dashboard cancel option while the job is in &ldquo;Pending Start&rdquo; status.</li>
                </ul>

                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2b. Provider No-Show or Abandonment</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>If the provider fails to start the job within the agreed timeframe without prior notice, or abandons a job already in progress without completing the agreed scope, you may request a full refund of unearned escrow funds.</li>
                  <li>LocalPro will investigate and may request evidence (e.g., screenshots of messages, photos).</li>
                </ul>

                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2c. Dispute Resolution in Client&apos;s Favour</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>If you raise a dispute and LocalPro&apos;s review determines the work was not completed or does not meet the agreed standard, a full or partial refund of the escrowed amount may be issued.</li>
                  <li>The extent of the refund will reflect the proportion of work that was found to be unsatisfactory.</li>
                </ul>

                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">2d. Platform Error</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>If a technical error on the LocalPro platform causes a double charge or incorrect payment amount, a corrective refund will be issued promptly on investigation and confirmation by our team.</li>
                </ul>
              </section>

              <section id="non-refundable" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">3. Non-Refundable Fees</h2>
                <p className="text-slate-600 leading-relaxed mb-3">The following are not refundable under any circumstances:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li><strong>Platform service fee</strong> — charged to clients at checkout and deducted from the total at time of payment.</li>
                  <li><strong>Bid credits</strong> — purchased or granted to providers for submitting proposals; consumed upon bid submission and non-refundable regardless of whether the bid is accepted.</li>
                  <li><strong>Featured listing upgrades</strong> — fees paid to feature a job posting are non-refundable once the listing has been published and activated.</li>
                  <li><strong>Training course or module enrolment fees</strong> — non-refundable after the course content has been accessed.</li>
                  <li><strong>Loyalty or promotional credits</strong> — non-transferable and have no cash value.</li>
                  <li><strong>Payment processing fees</strong> — fees charged by PayMongo or PayPal are non-refundable once a transaction is initiated.</li>
                </ul>
              </section>

              <section id="not-issued" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">4. When Refunds Are NOT Issued</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>You have already released escrow funds to the provider — once funds are released, the transaction is final and cannot be reversed by LocalPro.</li>
                  <li>Funds were auto-released to the provider after 7 days without a dispute being raised — you must raise a dispute within the 7-day window.</li>
                  <li>You are dissatisfied with the work but did not raise a dispute within the 7-day window after the provider marked the job complete.</li>
                  <li>Your refund request is based on a change of mind after work has been completed to the agreed standard.</li>
                  <li>The dispute was resolved in the provider&apos;s favour.</li>
                </ul>
              </section>

              <section id="request" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">5. How to Request a Refund</h2>
                <ol className="list-decimal pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>
                    <strong>Via dispute</strong> — If the job is still in progress or the provider has just marked it complete, navigate to the job in your dashboard and click &ldquo;Raise Dispute&rdquo;. Provide a clear description of the issue and any supporting evidence (photos, messages). LocalPro will review within 5–10 business days. See the{" "}
                    <Link href="/dispute-resolution" className="text-primary underline">
                      Dispute Resolution Policy
                    </Link>
                    .
                  </li>
                  <li>
                    <strong>Via support</strong> — For cancellations, provider no-shows, or platform errors, email{" "}
                    <strong>support@localpro.asia</strong> with your job ID, account email, and a description of the issue. Our team will respond within 2 business days.
                  </li>
                </ol>
              </section>

              <section id="timeline" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">6. Refund Processing Timeline</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li><strong>LocalPro wallet credit</strong> — Approved refunds credited to your LocalPro wallet are processed within <strong>1 business day</strong> of the decision.</li>
                  <li><strong>Original payment method (card/e-wallet)</strong> — Refunds returned to your original payment method are processed within <strong>3–7 business days</strong> after approval, depending on your bank or e-wallet provider.</li>
                  <li>LocalPro is not responsible for delays caused by banks, card networks, or e-wallet providers beyond our control.</li>
                </ul>
              </section>

              <section id="chargebacks" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">7. Chargebacks</h2>
                <p className="text-slate-600 leading-relaxed">
                  Initiating a chargeback with your bank or card issuer without first contacting LocalPro support
                  is a violation of this Policy and our Terms of Service. If a chargeback is initiated, LocalPro
                  reserves the right to suspend the account, withhold related escrow funds, and contest the
                  chargeback with the payment processor. Accounts with fraudulent chargeback patterns may be
                  permanently banned.
                </p>
              </section>

              <section id="contact" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">8. Contact</h2>
                <p className="text-slate-600 leading-relaxed">For refund questions or to request a refund, please reach out:</p>
                <ul className="list-none mt-3 space-y-1 text-slate-600">
                  <li>📧 <strong>support@localpro.asia</strong></li>
                  <li>🌐 <strong>localpro.asia</strong></li>
                </ul>
              </section>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-600">
                By using LocalPro, you agree that refunds of escrowed job amounts are handled in line with this Refund Policy and our{" "}
                <Link href="/escrow-policy" className="font-semibold text-brand-700 hover:text-brand-800">
                  Escrow Policy
                </Link>
                .
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
