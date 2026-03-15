import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyRepository } from "@/repositories/loyalty.repository";
import ReferralClient from "./_components/ReferralClient";

export const metadata: Metadata = {
  title: "Refer a Friend | LocalPro",
  description:
    "Invite friends to LocalPro and earn loyalty points when they complete their first job. Share your unique referral link today.",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export default async function ReferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/refer");

  let referralCode = "";
  let referralLink = "";
  let referredCount = 0;
  let currentPoints = 0;

  try {
    await connectDB();
    const account = await loyaltyService.getAccount(user.userId);
    referredCount = await loyaltyRepository.countReferrals(account.userId.toString());
    referralCode = account.referralCode ?? "";
    referralLink = `${APP_URL}/register?ref=${referralCode}`;
    currentPoints = account.points ?? 0;
  } catch { /* non-critical */ }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-bold text-primary tracking-tight">
            LocalPro
          </Link>
          <Link
            href="/client/dashboard"
            className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-blue-700 rounded-3xl text-white p-8 sm:p-12 text-center space-y-3">
          <div className="text-5xl mb-2">🎁</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Refer & Earn</h1>
          <p className="text-blue-100 text-base max-w-md mx-auto">
            Share your link. When a friend joins and completes their first job,
            you both earn <strong className="text-white">loyalty points</strong> — redeemable for ₱ credits.
          </p>
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold">+200</p>
              <p className="text-xs text-blue-200 mt-0.5">pts for you</p>
            </div>
            <div className="text-slate-300 text-2xl">+</div>
            <div className="text-center">
              <p className="text-3xl font-extrabold">+100</p>
              <p className="text-xs text-blue-200 mt-0.5">pts for your friend</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-3xl font-extrabold text-primary">{referredCount}</p>
            <p className="text-sm text-slate-500 mt-1">Friend{referredCount !== 1 ? "s" : ""} referred</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-3xl font-extrabold text-primary">{currentPoints.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Loyalty points earned</p>
          </div>
        </div>

        {/* Referral link widget */}
        <ReferralClient
          referralCode={referralCode}
          referralLink={referralLink}
        />

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-bold text-slate-900 text-lg">How it works</h2>
          <ol className="space-y-4">
            {[
              {
                n: "1",
                title: "Copy your unique link",
                body: "Share it with friends, on social media, or in group chats.",
              },
              {
                n: "2",
                title: "Friend signs up",
                body: "They register using your link — no code needed, it's automatic.",
              },
              {
                n: "3",
                title: "Both of you earn points",
                body: "You get +200 pts and your friend gets +100 pts after their first job.",
              },
              {
                n: "4",
                title: "Redeem for ₱ credits",
                body: "500 pts = ₱50 credit, usable on any job payment. No expiry.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
