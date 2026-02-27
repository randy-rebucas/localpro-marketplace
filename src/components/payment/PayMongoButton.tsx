"use client";

import { useState } from "react";
import toast from "react-hot-toast";

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
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Processing…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {label}
          <span className="text-primary-200 font-normal text-xs">
            ₱{amountPHP.toLocaleString()}
          </span>
        </>
      )}
    </button>
  );
}
