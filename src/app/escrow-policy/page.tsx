import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

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

const LEGAL_LINKS = [
  { href: "/terms",               label: "Terms of Service" },
  { href: "/privacy",             label: "Privacy Policy" },
  { href: "/provider-agreement",  label: "Provider Agreement" },
  { href: "/client-agreement",    label: "Client Agreement" },
  { href: "/escrow-policy",       label: "Escrow Policy" },
  { href: "/refund-policy",       label: "Refund Policy" },
  { href: "/dispute-resolution",  label: "Dispute Resolution" },
];

export default function EscrowPolicyPage() {
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
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Escrow Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: March 15, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. What Is Escrow?</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro uses an escrow payment system to protect both clients and service providers. When a
              client accepts a provider&apos;s bid, the agreed job amount is transferred by the client into a
              secure escrow account held by LocalPro. The funds are not released to the provider until the
              work is confirmed as completed — giving clients confidence that they will only pay for work
              delivered, and giving providers assurance that payment is secured before they begin.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. How Funds Are Held</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Escrow funds are collected from the client at the time of bid acceptance via our secure payment processors (PayMongo for Philippine peso transactions, PayPal for international payments).</li>
              <li>Funds are held in a segregated account maintained by LocalPro and are not commingled with LocalPro&apos;s operating funds.</li>
              <li>A non-refundable platform service fee (displayed at checkout) is deducted from the total charged to the client. The amount held in escrow is the net job amount agreed between client and provider.</li>
              <li>LocalPro does not earn interest on funds held in escrow. Escrow is purely a pass-through protection mechanism.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. When the Job Begins</h2>
            <p className="text-slate-600 leading-relaxed">
              Once the escrow payment is confirmed, the provider is notified and the job moves to
              &ldquo;In Progress&rdquo; status. The provider may begin work. Both parties can communicate
              through the LocalPro messaging system. All communications should be kept within the Platform
              for dispute resolution purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Releasing Funds</h2>
            <p className="text-slate-600 leading-relaxed mb-3">Escrow funds are released to the provider in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Manual release by client</strong> — The client clicks &ldquo;Release Payment&rdquo; after confirming the work meets the agreed standard. This is the standard and preferred method.</li>
              <li><strong>Automatic release</strong> — If the provider marks the job as &ldquo;Complete&rdquo; and the client does not release funds or raise a dispute within <strong>7 calendar days</strong>, funds are automatically released to the provider.</li>
              <li><strong>Partial release</strong> — For milestone-based jobs, the client may release partial amounts upon completion of each agreed milestone. The remainder stays in escrow until subsequent milestones are approved.</li>
              <li><strong>Dispute resolution outcome</strong> — If a dispute is raised and resolved in favour of the provider, all or part of the escrow is released to the provider per the ruling.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Dispute Hold</h2>
            <p className="text-slate-600 leading-relaxed">
              If a client raises a dispute before escrow is released, the funds are immediately frozen and
              held by LocalPro until the dispute is resolved. Neither party can access the funds while the
              dispute is under review. LocalPro will conduct a review and issue a ruling within 5–10 business
              days. For details, see the{" "}
              <Link href="/dispute-resolution" className="text-primary underline">Dispute Resolution Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Refunds From Escrow</h2>
            <p className="text-slate-600 leading-relaxed">
              Escrow funds may be returned to the client in the following situations:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed mt-3">
              <li>The provider fails to start or complete the job and the client cancels.</li>
              <li>The client cancels the job before work commences and the cancellation meets the criteria in the <Link href="/refund-policy" className="text-primary underline">Refund Policy</Link>.</li>
              <li>A dispute is resolved in the client&apos;s favour (full or partial refund).</li>
              <li>Technical failure by the Platform prevents job completion (assessed case by case).</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              The platform service fee is non-refundable in all circumstances. Refunds of the escrow job
              amount (minus the platform fee) are returned to the client&apos;s original payment method or
              credited to their LocalPro wallet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Withdrawal of Released Funds</h2>
            <p className="text-slate-600 leading-relaxed">
              Once escrow funds are released to a provider, they are credited to the provider&apos;s in-platform
              earnings wallet (after deduction of LocalPro&apos;s service commission). Providers may withdraw
              their wallet balance to a verified Philippine bank account or GCash number once KYC is
              approved and the minimum withdrawal threshold is met. Processing time is typically 1–3 business
              days. LocalPro is not responsible for delays caused by banks or third-party payment processors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Off-Platform Payments</h2>
            <p className="text-slate-600 leading-relaxed">
              Making or accepting payments outside the LocalPro escrow system (&ldquo;going off-platform&rdquo;) is
              a violation of our Terms of Service. Off-platform payments are not protected by escrow and
              LocalPro cannot investigate disputes, process refunds, or take any action regarding transactions
              made outside the Platform. Providers and clients who engage in off-platform transactions may
              have their accounts suspended or permanently terminated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Currency &amp; Processing Fees</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>All Philippine escrow transactions are denominated in Philippine Peso (PHP).</li>
              <li>Payment processing fees charged by third-party processors (PayMongo, PayPal) are included in the platform service fee displayed at checkout and are non-refundable.</li>
              <li>International transactions may be subject to currency conversion rates set by PayPal or the client&apos;s bank. LocalPro is not responsible for exchange rate differences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">10. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions or concerns about a specific escrow transaction, please contact support:
            </p>
            <ul className="list-none mt-3 space-y-1 text-slate-600">
              <li>📧 <strong>support@localpro.asia</strong></li>
              <li>🌐 <strong>localpro.asia</strong></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {LEGAL_LINKS.filter((l) => l.href !== "/escrow-policy").map((l, i, arr) => (
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
