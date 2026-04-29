import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "what-is", title: "What Is Escrow?" },
  { id: "held", title: "How Funds Are Held" },
  { id: "job-begins", title: "When the Job Begins" },
  { id: "releasing", title: "Releasing Funds" },
  { id: "dispute-hold", title: "Dispute Hold" },
  { id: "refunds", title: "Refunds From Escrow" },
  { id: "withdrawal", title: "Withdrawal of Released Funds" },
  { id: "off-platform", title: "Off-Platform Payments" },
  { id: "currency", title: "Currency & Processing Fees" },
  { id: "contact", title: "Contact" },
];

export const metadata: Metadata = {
  title: "Escrow Policy",
  description:
    "Learn how LocalPro's escrow system securely holds, releases, and refunds payments between clients and service providers on the LocalPro Marketplace.",
  alternates: { canonical: `${APP_URL}/escrow-policy` },
  openGraph: {
    title: "Escrow Policy | LocalPro",
    description: "Learn how LocalPro's escrow system protects clients and providers.",
    url: `${APP_URL}/escrow-policy`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function EscrowPolicyPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <PublicHeader />

      <main>
        <section className="bg-gradient-to-br from-white via-brand-50/30 to-primary-50/50">
          <div className="mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Legal</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0a2540] sm:text-5xl">Escrow Policy</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                How LocalPro holds, releases, and refunds payments between clients and service providers — so jobs
                are paid fairly and disputes can be reviewed with clear records.
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
              <h2 className="text-sm font-extrabold text-[#0a2540]">Questions about escrow?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you have questions about holds, releases, or a specific transaction, our support team can help.
              </p>
              <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                Contact Support
              </Link>
            </div>
          </aside>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <div className="prose prose-slate max-w-none space-y-8 prose-h2:text-[#0a2540] prose-p:text-slate-600 prose-li:text-slate-600">
              <section id="what-is" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">1. What Is Escrow?</h2>
                <p className="text-slate-600 leading-relaxed">
                  LocalPro uses an escrow payment system to protect both clients and service providers. When a
                  client accepts a provider&apos;s bid, the agreed job amount is transferred by the client into a
                  secure escrow account held by LocalPro. The funds are not released to the provider until the
                  work is confirmed as completed — giving clients confidence that they will only pay for work
                  delivered, and giving providers assurance that payment is secured before they begin.
                </p>
              </section>

              <section id="held" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">2. How Funds Are Held</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>
                    Escrow funds are collected from the client at the time of bid acceptance via our secure payment
                    processors (PayMongo for Philippine peso transactions, PayPal for international payments).
                  </li>
                  <li>Funds are held in a segregated account maintained by LocalPro and are not commingled with LocalPro&apos;s operating funds.</li>
                  <li>
                    A non-refundable platform service fee (displayed at checkout) is deducted from the total charged to
                    the client. The amount held in escrow is the net job amount agreed between client and provider.
                  </li>
                  <li>LocalPro does not earn interest on funds held in escrow. Escrow is purely a pass-through protection mechanism.</li>
                </ul>
              </section>

              <section id="job-begins" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">3. When the Job Begins</h2>
                <p className="text-slate-600 leading-relaxed">
                  Once the escrow payment is confirmed, the provider is notified and the job moves to
                  &ldquo;In Progress&rdquo; status. The provider may begin work. Both parties can communicate
                  through the LocalPro messaging system. All communications should be kept within the Platform
                  for dispute resolution purposes.
                </p>
              </section>

              <section id="releasing" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">4. Releasing Funds</h2>
                <p className="text-slate-600 leading-relaxed mb-3">Escrow funds are released to the provider in the following circumstances:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>
                    <strong>Manual release by client</strong> — The client clicks &ldquo;Release Payment&rdquo; after confirming the work meets the agreed standard. This is the standard and preferred method.
                  </li>
                  <li>
                    <strong>Automatic release</strong> — If the provider marks the job as &ldquo;Complete&rdquo; and the client does not release funds or raise a dispute within <strong>7 calendar days</strong>, funds are automatically released to the provider.
                  </li>
                  <li>
                    <strong>Partial release</strong> — For milestone-based jobs, the client may release partial amounts upon completion of each agreed milestone. The remainder stays in escrow until subsequent milestones are approved.
                  </li>
                  <li>
                    <strong>Dispute resolution outcome</strong> — If a dispute is raised and resolved in favour of the provider, all or part of the escrow is released to the provider per the ruling.
                  </li>
                </ul>
              </section>

              <section id="dispute-hold" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">5. Dispute Hold</h2>
                <p className="text-slate-600 leading-relaxed">
                  If a client raises a dispute before escrow is released, the funds are immediately frozen and
                  held by LocalPro until the dispute is resolved. Neither party can access the funds while the
                  dispute is under review. LocalPro will conduct a review and issue a ruling within 5–10 business
                  days. For details, see the{" "}
                  <Link href="/dispute-resolution" className="text-primary underline">
                    Dispute Resolution Policy
                  </Link>
                  .
                </p>
              </section>

              <section id="refunds" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">6. Refunds From Escrow</h2>
                <p className="text-slate-600 leading-relaxed">Escrow funds may be returned to the client in the following situations:</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed mt-3">
                  <li>The provider fails to start or complete the job and the client cancels.</li>
                  <li>
                    The client cancels the job before work commences and the cancellation meets the criteria in the{" "}
                    <Link href="/refund-policy" className="text-primary underline">
                      Refund Policy
                    </Link>
                    .
                  </li>
                  <li>A dispute is resolved in the client&apos;s favour (full or partial refund).</li>
                  <li>Technical failure by the Platform prevents job completion (assessed case by case).</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-3">
                  The platform service fee is non-refundable in all circumstances. Refunds of the escrow job
                  amount (minus the platform fee) are returned to the client&apos;s original payment method or
                  credited to their LocalPro wallet.
                </p>
              </section>

              <section id="withdrawal" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">7. Withdrawal of Released Funds</h2>
                <p className="text-slate-600 leading-relaxed">
                  Once escrow funds are released to a provider, they are credited to the provider&apos;s in-platform
                  earnings wallet (after deduction of LocalPro&apos;s service commission). Providers may withdraw
                  their wallet balance to a verified Philippine bank account or GCash number once KYC is
                  approved and the minimum withdrawal threshold is met. Processing time is typically 1–3 business
                  days. LocalPro is not responsible for delays caused by banks or third-party payment processors.
                </p>
              </section>

              <section id="off-platform" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">8. Off-Platform Payments</h2>
                <p className="text-slate-600 leading-relaxed">
                  Making or accepting payments outside the LocalPro escrow system (&ldquo;going off-platform&rdquo;) is
                  a violation of our Terms of Service. Off-platform payments are not protected by escrow and
                  LocalPro cannot investigate disputes, process refunds, or take any action regarding transactions
                  made outside the Platform. Providers and clients who engage in off-platform transactions may
                  have their accounts suspended or permanently terminated.
                </p>
              </section>

              <section id="currency" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">9. Currency &amp; Processing Fees</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>All Philippine escrow transactions are denominated in Philippine Peso (PHP).</li>
                  <li>Payment processing fees charged by third-party processors (PayMongo, PayPal) are included in the platform service fee displayed at checkout and are non-refundable.</li>
                  <li>International transactions may be subject to currency conversion rates set by PayPal or the client&apos;s bank. LocalPro is not responsible for exchange rate differences.</li>
                </ul>
              </section>

              <section id="contact" className="scroll-mt-28">
                <h2 className="text-xl font-bold text-slate-800 mb-3">10. Contact</h2>
                <p className="text-slate-600 leading-relaxed">For questions or concerns about a specific escrow transaction, please contact support:</p>
                <ul className="list-none mt-3 space-y-1 text-slate-600">
                  <li>📧 <strong>support@localpro.asia</strong></li>
                  <li>🌐 <strong>localpro.asia</strong></li>
                </ul>
              </section>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-600">
                By using LocalPro&apos;s escrow system, you acknowledge that payments are held and released in line with this Escrow Policy and our Terms of Service.
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
