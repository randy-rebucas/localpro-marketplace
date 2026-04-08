import Link from "next/link";
import type { Metadata } from "next";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Support & Help Center",
  description: "Get help with your LocalPro account, jobs, payments, and more. Find answers to common questions or contact our support team.",
  alternates: { canonical: `${APP_URL}/support` },
  openGraph: {
    title: "Support & Help Center | LocalPro",
    description: "Get help with your LocalPro account, jobs, payments, and more.",
    url: `${APP_URL}/support`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <PublicHeader />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Support & Help Center</h1>
        <p className="text-sm text-slate-400 mb-10">Find answers to your questions or get in touch with our support team</p>

        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Getting Started</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Creating an account</strong> — Sign up as a client or service provider and complete your profile setup.</li>
              <li><strong>Profile verification</strong> — Verify your identity and credentials to build trust on the platform.</li>
              <li><strong>KYC requirements</strong> — Understand what documents are needed for identity verification.</li>
              <li><strong>Two-factor authentication</strong> — Secure your account with an additional security layer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">For Clients</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Posting a job</strong> — How to create, edit, and manage job postings.</li>
              <li><strong>Finding providers</strong> — Browse and search for qualified service providers.</li>
              <li><strong>Making payments</strong> — Understanding our payment methods and escrow system.</li>
              <li><strong>Reviewing providers</strong> — Leave feedback and ratings after a job is completed.</li>
              <li><strong>Job cancellation</strong> — How to cancel or reschedule a job safely.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">For Service Providers</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Optimizing your profile</strong> — Create an attractive profile to attract more clients.</li>
              <li><strong>Managing availability</strong> — Update your availability and service areas.</li>
              <li><strong>Bidding on jobs</strong> — How to submit proposals and win jobs.</li>
              <li><strong>Completing jobs</strong> — Best practices for delivering excellent service.</li>
              <li><strong>Withdrawals</strong> — Request payments and manage your earnings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Payments & Billing</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Payment methods</strong> — We accept PayMongo and PayPal for secure transactions.</li>
              <li><strong>How escrow works</strong> — Your payment is held safely until the job is completed.</li>
              <li><strong>Withdrawal processing</strong> — Earnings are processed within 3-5 business days.</li>
              <li><strong>Refunds</strong> — Understand our refund policy and how to request one.</li>
              <li><strong>Billing disputes</strong> — Resolve payment issues with our support team.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Disputes & Safety</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Dispute resolution</strong> — How we handle disagreements between clients and providers.</li>
              <li><strong>Reporting issues</strong> — Report suspicious activity, fraud, or policy violations.</li>
              <li><strong>Safety guidelines</strong> — Best practices for safe transactions and communication.</li>
              <li><strong>Account suspension</strong> — Reasons your account might be suspended and how to appeal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">How long does account verification take?</h3>
                <p className="text-slate-600">Account verification typically takes 24-48 hours. In rare cases, it may take up to 5 business days.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Can I change my account role from client to provider?</h3>
                <p className="text-slate-600">Yes, you can switch roles at any time by updating your account settings. However, you can only have one active role at a time.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">What if I forget my password?</h3>
                <p className="text-slate-600">Click &quot;Forgot Password&quot; on the login page and follow the email instructions to reset your password.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Is my personal information safe?</h3>
                <p className="text-slate-600">We use industry-standard encryption and security practices to protect your data. See our <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-semibold">Privacy Policy</Link> for details.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Still Need Help?</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you can't find the answer you're looking for, our support team is here to help. You can reach us through:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Email</strong> — support@localpro.asia</li>
              <li><strong>In-app messaging</strong> — Contact us directly through the platform for immediate assistance</li>
              <li><strong>Help section</strong> — Visit your account settings for additional resources</li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
