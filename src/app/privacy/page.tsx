import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — LocalPro",
  description: "Learn how LocalPro collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <span className="text-lg font-bold text-slate-900">LocalPro</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
            <Link href="/register" className="btn-primary text-sm">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: February 28, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the LocalPro Marketplace platform
              available at <strong>localpro.asia</strong>. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our platform. By registering or using
              LocalPro, you agree to the collection and use of information as described in this policy.
            </p>
          </section>

          <section>
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

          <section>
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

          <section>
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

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              We use essential cookies for authentication (session tokens stored as secure, HTTP-only cookies)
              and analytics cookies (Google Analytics / Tag Manager) to understand how the platform is used.
              You can disable non-essential cookies through your browser settings, though some features may
              not function correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your account data for as long as your account is active. KYC documents are deleted
              within 30 days after verification is completed or rejected. You may request deletion of your
              account at any time by contacting <strong>privacy@localpro.asia</strong>. Some data (e.g.,
              payment records) may be retained for up to 7 years for tax and legal compliance.
            </p>
          </section>

          <section>
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

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement industry-standard security measures: TLS encryption in transit, bcrypt password
              hashing, HTTP-only authentication cookies, Content Security Policy headers, and role-based
              access control. However, no system is 100% secure — please use a strong, unique password and
              keep your credentials confidential.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              LocalPro is not intended for users under 18 years of age. We do not knowingly collect personal
              data from minors. If you believe a minor has registered, contact us and we will delete the
              account promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">10. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify registered users by email
              and post the updated policy on this page with a new &ldquo;Last updated&rdquo; date. Continued use of
              the platform after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
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

        <div className="mt-12 pt-8 border-t border-slate-200 flex items-center gap-4 text-sm text-slate-400">
          <Link href="/terms"   className="hover:text-primary transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/"        className="hover:text-primary transition-colors">Back to Home</Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">LP</span>
            </div>
            <span className="text-sm font-semibold text-white">LocalPro</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
