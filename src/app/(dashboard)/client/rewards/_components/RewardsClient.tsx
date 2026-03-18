"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoyaltyBadge from "@/components/shared/LoyaltyBadge";
import { getClientTier, pointsToCredits } from "@/lib/loyalty";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Gift, Star, Users, Wallet, Copy, Check, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ClientTier, ILoyaltyAccount, ILoyaltyTransaction } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RewardsData {
  account: ILoyaltyAccount & { tier: ClientTier };
  ledger: ILoyaltyTransaction[];
  referralCode: string;
  referralLink: string;
  referredCount: number;
}

// ─── Ledger labels ────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  earned_job:       "text-green-600",
  earned_first_job: "text-green-600",
  earned_referral:  "text-blue-600",
  earned_review:    "text-purple-600",
  redeemed:         "text-amber-600",
  credit_applied:   "text-slate-500",
};

// ─── Redeem Modal ─────────────────────────────────────────────────────────────

function RedeemModal({
  maxPoints,
  onClose,
  onSuccess,
}: {
  maxPoints: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("clientPages");
  const [pts, setPts] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const creditPreview = pointsToCredits(pts);
  const isValid = pts >= 500 && pts % 100 === 0 && pts <= maxPoints;

  async function handleRedeem() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: pts }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("clientRewards_redeemError"));
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">{t("clientRewards_redeemTitle")}</h3>
        <p className="text-sm text-slate-500">
          {t("clientRewards_redeemDesc")}
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("clientRewards_redeemLabel")}</label>
          <input
            type="number"
            min={500}
            max={maxPoints}
            step={100}
            value={pts}
            onChange={(e) => setPts(Number(e.target.value))}
            className="input w-full"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("clientRewards_redeemAvailable", { pts: maxPoints })}
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 font-medium">{t("clientRewards_redeemWillReceive")}</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(creditPreview)}</p>
          <p className="text-xs text-green-500">{t("clientRewards_redeemCashback")}</p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline" disabled={loading}>
            {t("clientRewards_btnCancelRedeem")}
          </button>
          <button
            onClick={handleRedeem}
            className="flex-1 btn-primary"
            disabled={!isValid || loading}
          >
            {loading ? t("clientRewards_btnRedeeming") : t("clientRewards_btnRedeem")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function RewardsClient({ data }: { data: RewardsData }) {
  const t = useTranslations("clientPages");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);

  const { account, ledger, referralCode, referralLink, referredCount } = data;
  const tierInfo = getClientTier(account.lifetimePoints);

  const TYPE_LABEL: Record<string, string> = {
    earned_job:       t("clientRewards_typeEarnedJob"),
    earned_first_job: t("clientRewards_typeFirstJob"),
    earned_referral:  t("clientRewards_typeReferral"),
    earned_review:    t("clientRewards_typeReview"),
    redeemed:         t("clientRewards_typeRedeemed"),
    credit_applied:   t("clientRewards_typeCreditApplied"),
  };

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {showRedeem && (
        <RedeemModal
          maxPoints={account.points}
          onClose={() => setShowRedeem(false)}
          onSuccess={() => {
            setShowRedeem(false);
            router.refresh();
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t("clientRewards_heading")}</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {t("clientRewards_subheading")}
          </p>
        </div>
        <LoyaltyBadge tier={account.tier} size="md" />
      </div>

      {/* Tier progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-slate-800">{t("clientRewards_tierMember", { tier: tierInfo.label })}</span>
          </div>
          <span className="text-xs text-slate-400">
            {t("clientRewards_lifetimePoints", { pts: account.lifetimePoints.toLocaleString() })}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all"
            style={{ width: `${tierInfo.progress}%` }}
          />
        </div>
        {tierInfo.next ? (
          <p className="text-xs text-slate-500">
            {t("clientRewards_ptsToNext", { pts: tierInfo.pointsToNext.toLocaleString(), next: tierInfo.next })}
          </p>
        ) : (
          <p className="text-xs text-violet-600 font-medium">
            {t("clientRewards_highestTier")}
          </p>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Points */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">{t("clientRewards_pointsBalance")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {account.points.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("clientRewards_worthInCredits", { amount: formatCurrency(pointsToCredits(account.points)) })}
              </p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Star className="h-5 w-5" />
            </div>
          </div>
          <button
            onClick={() => setShowRedeem(true)}
            className="mt-3 w-full btn-primary text-xs py-1.5"
            disabled={account.points < 500}
          >
            {account.points >= 500
              ? t("clientRewards_btnRedeemPoints")
              : t("clientRewards_needMorePts", { n: 500 - account.points })}
          </button>
        </div>

        {/* Credits */}
        <div
          className={`rounded-2xl border shadow-card p-5 ${
            account.credits > 0
              ? "bg-green-50 border-green-200"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`text-xs font-medium ${
                  account.credits > 0 ? "text-green-600" : "text-slate-500"
                }`}
              >
                {t("clientRewards_cashbackCredits")}
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  account.credits > 0 ? "text-green-700" : "text-slate-400"
                }`}
              >
                {formatCurrency(account.credits)}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  account.credits > 0 ? "text-green-500" : "text-slate-400"
                }`}
              >
                {t("clientRewards_creditsAutoApplied")}
              </p>
            </div>
            <div
              className={`p-2.5 rounded-xl ${
                account.credits > 0
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Referrals */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">{t("clientRewards_referrals")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{referredCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t("clientRewards_friendsReferred")}</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-slate-800">{t("clientRewards_inviteTitle")}</h3>
        </div>
        <p className="text-sm text-slate-500">
          {t("clientRewards_inviteDesc")}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 truncate">
            {referralLink}
          </div>
          <button
            onClick={copyLink}
            className="flex-shrink-0 btn-outline flex items-center gap-1.5 text-sm px-3 py-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? t("clientRewards_btnCopied") : t("clientRewards_btnCopy")}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {t("clientRewards_yourCode")}{" "}
          <strong className="font-mono text-slate-600">{referralCode}</strong>
        </p>
      </div>

      {/* Activity ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{t("clientRewards_activityTitle")}</h3>
        </div>
        {ledger.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400">
            <Star className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            <p className="text-sm">
              {t("clientRewards_emptyActivity")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ledger.map((entry) => (
              <li
                key={String(entry._id)}
                className="px-5 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {TYPE_LABEL[entry.type] ?? entry.type}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{entry.description}</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {formatRelativeTime(new Date(entry.createdAt))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      entry.points >= 0
                        ? (TYPE_COLOR[entry.type] ?? "text-green-600")
                        : "text-red-500"
                    }`}
                  >
                    {entry.points >= 0 ? "+" : ""}{entry.points} pts
                  </p>
                  {entry.credits !== 0 && (
                    <p className="text-xs text-slate-400">
                      {entry.credits > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(entry.credits))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
