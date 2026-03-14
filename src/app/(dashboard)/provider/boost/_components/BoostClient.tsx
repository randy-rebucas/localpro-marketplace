"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  Zap,
  Star,
  Home,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  CreditCard,
  Ban,
  TrendingUp,
} from "lucide-react";
import type { FeaturedListingType } from "@/types";
import {
  FEATURED_LISTING_LABELS,
  FEATURED_LISTING_DESCRIPTIONS,
} from "@/types";

interface ActiveBoost {
  _id: string;
  type: FeaturedListingType;
  status: string;
  expiresAt: string;
  amountPaid: number;
}

interface BoostClientProps {
  activeBoosts: ActiveBoost[];
  history: ActiveBoost[];
  walletBalance: number;
  prices: Record<FeaturedListingType, number>;
}

const BOOST_ICONS: Record<FeaturedListingType, React.ReactNode> = {
  featured_provider:  <Star className="h-6 w-6" />,
  top_search:         <TrendingUp className="h-6 w-6" />,
  homepage_highlight: <Home className="h-6 w-6" />,
};

const BOOST_COLORS: Record<FeaturedListingType, { card: string; icon: string; badge: string }> = {
  featured_provider:  { card: "border-amber-200 bg-amber-50",   icon: "bg-amber-100 text-amber-600",   badge: "bg-amber-100 text-amber-700 border-amber-200" },
  top_search:         { card: "border-blue-200 bg-blue-50",     icon: "bg-blue-100 text-blue-600",     badge: "bg-blue-100 text-blue-700 border-blue-200" },
  homepage_highlight: { card: "border-violet-200 bg-violet-50", icon: "bg-violet-100 text-violet-600", badge: "bg-violet-100 text-violet-700 border-violet-200" },
};

const ALL_TYPES: FeaturedListingType[] = [
  "featured_provider",
  "top_search",
  "homepage_highlight",
];

function daysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function BoostClient({
  activeBoosts,
  history,
  walletBalance,
  prices,
}: BoostClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<FeaturedListingType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ActiveBoost | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  function openPurchaseModal(type: FeaturedListingType) {
    setSelectedType(type);
    setShowModal(true);
  }

  function getActiveBoost(type: FeaturedListingType): ActiveBoost | undefined {
    return activeBoosts.find((b) => b.type === type && b.status === "active");
  }

  async function purchase(payWith: "wallet" | "paymongo") {
    if (!selectedType) return;
    setLoading(`buy-${selectedType}`);
    setShowModal(false);
    try {
      const res = await apiFetch("/api/provider/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, payWith }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to activate boost.");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.success("Boost activated! 🚀 Your profile is now featured.");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function cancelBoost() {
    if (!cancelTarget) return;
    setLoading(`cancel-${cancelTarget._id}`);
    setShowCancelModal(false);
    try {
      const res = await apiFetch(`/api/provider/boost/${cancelTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to cancel boost.");
        return;
      }
      toast.success("Boost cancelled.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(null);
      setCancelTarget(null);
    }
  }

  const currentPrice = selectedType ? prices[selectedType] : 0;
  const canPayWallet = walletBalance >= currentPrice;

  const pastHistory = history.filter((b) => b.status !== "active");

  return (
    <div className="space-y-8">
      {/* ── Boost tier cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ALL_TYPES.map((type) => {
          const active = getActiveBoost(type);
          const colors = BOOST_COLORS[type];
          const isLoading = loading === `buy-${type}`;

          return (
            <div
              key={type}
              className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${
                active ? colors.card : "border-slate-200 bg-white"
              }`}
            >
              {active && (
                <div className={`absolute -top-3 right-4 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors.badge}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  Active · {daysLeft(active.expiresAt)}d left
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${active ? colors.icon : "bg-slate-100 text-slate-500"}`}>
                  {BOOST_ICONS[type]}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm leading-snug">
                    {FEATURED_LISTING_LABELS[type]}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">
                    {formatCurrency(prices[type])}<span className="font-normal">/week</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed flex-1">
                {FEATURED_LISTING_DESCRIPTIONS[type]}
              </p>

              {active ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Expires {new Date(active.expiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <button
                    className="text-xs text-slate-400 hover:text-red-500 underline underline-offset-2 self-start transition-colors"
                    onClick={() => { setCancelTarget(active); setShowCancelModal(true); }}
                    disabled={!!loading}
                  >
                    Cancel boost
                  </button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  isLoading={isLoading}
                  onClick={() => openPurchaseModal(type)}
                  disabled={!!loading}
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Boost Now
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Wallet balance hint ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
        <Wallet className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span>Wallet balance: <strong className="text-slate-800">{formatCurrency(walletBalance)}</strong></span>
        {walletBalance < Math.min(...Object.values(prices)) && (
          <span className="ml-auto text-xs text-amber-600 font-medium">
            Top up wallet or pay via card to purchase a boost.
          </span>
        )}
      </div>

      {/* ── History ─────────────────────────────────────────────────────── */}
      {pastHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Past Boosts</h3>
          <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
            {pastHistory.map((item, i) => (
              <div
                key={item._id}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400">
                    {item.status === "cancelled" ? <Ban className="h-4 w-4 text-red-400" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                  </span>
                  <div>
                    <p className="font-medium text-slate-700">{FEATURED_LISTING_LABELS[item.type]}</p>
                    <p className="text-xs text-slate-400">
                      {item.status === "cancelled" ? "Cancelled" : "Expired"} · {new Date(item.expiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-slate-500 font-medium">{formatCurrency(item.amountPaid)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Purchase modal ───────────────────────────────────────────────── */}
      {selectedType && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Boost — ${FEATURED_LISTING_LABELS[selectedType]}`}
        >
          <div className="space-y-4 text-sm">
            <p className="text-slate-500">{FEATURED_LISTING_DESCRIPTIONS[selectedType]}</p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>Boost duration</span>
                <span className="text-slate-700 font-medium">7 days</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Price</span>
                <span className="text-slate-700 font-semibold">{formatCurrency(currentPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Wallet balance</span>
                <span className={`font-medium ${canPayWallet ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(walletBalance)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Boosts are non-refundable. Cancelling an active boost does not issue a refund.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                className="w-full"
                onClick={() => purchase("wallet")}
                disabled={!canPayWallet}
                isLoading={loading === `buy-${selectedType}`}
              >
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                Pay from Wallet ({formatCurrency(walletBalance)})
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => purchase("paymongo")}
                disabled={!!loading}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Pay via Card / GCash
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowModal(false)}
                disabled={!!loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Cancel confirmation modal ────────────────────────────────────── */}
      {cancelTarget && (
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancel Boost?"
        >
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              Are you sure you want to cancel your{" "}
              <strong>{FEATURED_LISTING_LABELS[cancelTarget.type]}</strong> boost?
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Boosts are non-refundable. You will <strong>not</strong> receive a refund for the remaining days.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCancelModal(false)}
                disabled={!!loading}
              >
                Keep Boost
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                isLoading={loading === `cancel-${cancelTarget._id}`}
                onClick={cancelBoost}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
