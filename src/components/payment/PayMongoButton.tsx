"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, CreditCard } from "lucide-react";

interface PayMongoButtonProps {
  jobId: string;
  amountPHP: number;
  /** Called after successful simulated payment (dev mode) */
  onSimulated?: () => void;
  className?: string;
  label?: string;
}

/**
 * PayMongoButton
 *
 * Initiates a PayMongo Checkout Session for escrow funding.
 *
 * Live mode  → redirects the user to the PayMongo-hosted checkout page.
 * Dev mode   → immediately funds escrow (no PAYMONGO_SECRET_KEY needed).
 */
export default function PayMongoButton({
  jobId,
  amountPHP,
  onSimulated,
  className = "",
  label = "Fund Escrow",
}: PayMongoButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to initiate payment");
        return;
      }

      if (data.simulated) {
        toast.success("Escrow funded (dev simulation)");
        onSimulated?.();
        return;
      }

      // Redirect to PayMongo-hosted checkout page
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing…
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          {label}
          <span className="text-primary-200 font-normal text-xs">
            ₱{amountPHP.toLocaleString()}
          </span>
        </>
      )}
    </button>
  );
}
