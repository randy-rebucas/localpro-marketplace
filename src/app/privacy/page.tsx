import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, HelpCircle, LockKeyhole, Printer, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "information", title: "Information We Collect" },
  { id: "use", title: "How We Use Information" },
  { id: "sharing", title: "Sharing of Information" },
  { id: "cookies", title: "Cookies" },
  { id: "retention", title: "Data Retention" },
  { id: "rights", title: "Your Privacy Rights" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children's Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how LocalPro collects, uses, and protects your personal information on our service marketplace platform.",
  alternates: { canonical: `${APP_URL}/privacy` },
  openGraph: {
    title: "Privacy Policy | LocalPro",
    description: "Learn how LocalPro collects, uses, and protects your personal information.",
    url: `${APP_URL}/privacy`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function PrivacyPage() {
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
                Privacy Policy
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Learn how LocalPro collects, uses, discloses, and protects your personal information across our marketplace platform.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <CalendarDays className="h-4 w-4 text-brand-700" />
                Last Updated: May 15, 2024
              </p>
            </div>
            <div className="hidden justify-center lg:flex">
              <div className="relative flex h-56 w-72 items-center justify-center rounded-[2rem] bg-brand-50">
                <div className="absolute left-8 top-6 flex h-40 w-32 items-center justify-center rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
                  <LockKeyhole className="h-14 w-14 text-brand-700" />
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
              <h2 className="text-sm font-extrabold text-[#0a2540]">Privacy questions?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Contact us if you need help with your data or privacy rights.
              </p>
              <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                Contact Support
              </Link>
            </div>
          </aside>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
            <div className="prose prose-slate max-w-none space-y-8 prose-h2:text-[#0a2540] prose-p:text-slate-600 prose-li:text-slate-600">

          <section id="introduction" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the LocalPro Marketplace platform
              available at <strong>localpro.asia</strong>. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our platform. By registering or using
              LocalPro, you agree to the collection and use of information as described in this policy.
            </p>
          </section>

          <section id="information" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Account information</strong> — name, email address, phone number, and password (stored as a secure hash).</li>
              <li><strong>Profile information</strong> — bio, skills, service categories, hourly rate, and profile photos uploaded by service providers.</li>
              <li><strong>Government-issued ID / KYC documents</strong> — uploaded voluntarily by providers for identity verification; stored encrypted on our secure servers.</li>
              <li><strong>Location data</strong> — general location (city/barangay) you provide when posting a job, and optional GPS coordinates with your explicit permission.</li>
              <li><strong>Payment information</strong> — transactions are processed by PayMongo. We store transaction references and amounts; we do not store raw card numbers.</li>
              <li><strong>Usage data</strong> — pages visited, features used, and actions taken on the platform, collected via cookies and server logs.</li>
              <li><strong>Communications</strong> — messages exchanged between clients and providers through our in-app messaging, used to resolve disputes and improve the platform.</li>
            </ul>
          </section>

          <section id="use" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>To create and manage your account.</li>
              <li>To match clients with service providers relevant to their posted jobs.</li>
              <li>To process payments and manage escrow holdings.</li>
              <li>To send transactional notifications (OTP codes, job updates, payment receipts).</li>
              <li>To verify provider identities through our KYC review process.</li>
              <li>To investigate and resolve disputes between clients and providers.</li>
              <li>To improve platform features, detect fraud, and maintain security.</li>
              <li>To comply with legal and regulatory requirements in the Philippines.</li>
            </ul>
          </section>

          <section id="sharing" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Sharing of Information</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We do not sell your personal data. We share information only in these circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li><strong>Between users</strong> — provider profiles (name, skills, rating, bio) are visible to clients browsing or posting jobs.</li>
              <li><strong>Service providers</strong> — PayMongo (payments), Twilio (SMS OTP), Cloudinary (file storage), MongoDB Atlas (database hosting), and Vercel (hosting). Each is bound by a data processing agreement.</li>
              <li><strong>Legal obligations</strong> — when required by Philippine law, a court order, or government authority.</li>
              <li><strong>Business transfers</strong> — in the event of a merger or acquisition, with prior notice to users.</li>
            </ul>
          </section>

          <section id="cookies" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              We use essential cookies for authentication (session tokens stored as secure, HTTP-only cookies)
              and analytics cookies (Google Analytics / Tag Manager) to understand how the platform is used.
              You can disable non-essential cookies through your browser settings, though some features may
              not function correctly.
            </p>
          </section>

          <section id="retention" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your account data for as long as your account is active. KYC documents are deleted
              within 30 days after verification is completed or rejected. You may request deletion of your
              account at any time by contacting <strong>privacy@localpro.asia</strong>. Some data (e.g.,
              payment records) may be retained for up to 7 years for tax and legal compliance.
            </p>
          </section>

          <section id="rights" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Your Rights (Republic Act 10173 — Data Privacy Act)</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Under the Philippine Data Privacy Act of 2012, you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
              <li>Be informed about how your data is processed.</li>
              <li>Access a copy of your personal data held by us.</li>
              <li>Correct inaccurate or incomplete personal data.</li>
              <li>Erasure or blocking of your data under certain conditions.</li>
              <li>Object to the processing of your data for direct marketing.</li>
              <li>Lodge a complaint with the National Privacy Commission (NPC).</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              To exercise any of these rights, contact us at <strong>privacy@localpro.asia</strong>.
            </p>
          </section>

          <section id="security" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement industry-standard security measures: TLS encryption in transit, bcrypt password
              hashing, HTTP-only authentication cookies, Content Security Policy headers, and role-based
              access control. However, no system is 100% secure — please use a strong, unique password and
              keep your credentials confidential.
            </p>
          </section>

          <section id="children" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro is not intended for users under 18 years of age. We do not knowingly collect personal
              data from minors. If you believe a minor has registered, contact us and we will delete the
              account promptly.
            </p>
          </section>

          <section id="changes" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">10. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify registered users by email
              and post the updated policy on this page with a new &ldquo;Last updated&rdquo; date. Continued use of
              the platform after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section id="contact" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-slate-800 mb-3">11. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have questions or concerns about this Privacy Policy, please reach out:
            </p>
            <ul className="list-none mt-3 space-y-1 text-slate-600">
              <li>📧 <strong>privacy@localpro.asia</strong></li>
              <li>🌐 <strong>localpro.asia</strong></li>
            </ul>
          </section>
            </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">
            By using LocalPro, you acknowledge that you have read and understood how we handle your personal information.
          </p>
          <a href="#top" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
            <Printer className="h-4 w-4" />
            Print this page
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6 text-sm text-slate-400">
          <Link href="/terms"              className="hover:text-primary transition-colors">Terms of Service</Link>
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
