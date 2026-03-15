"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, CreditCard, Shield } from "lucide-react";

interface PayMongoButtonProps {
  jobId: string;
  amountPHP: number;
  /**
   * Non-refundable escrow service fee (PHP).
   * When provided together with totalCharge, an itemised breakdown is shown
   * above the button and the gateway receives totalCharge instead of amountPHP.
   */
  escrowFee?: number;
  /** Non-refundable payment processing fee (PHP). */
  processingFee?: number;
  /** Flat urgent booking fee (PHP, ₱0 for standard bookings). */
  urgencyFee?: number;
  /** Non-refundable client-side platform service fee (PHP). */
  platformServiceFee?: number;
  /** Total charged at checkout = amountPHP + all fees */
  totalCharge?: number;
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
 *
 * When `escrowFee` and `totalCharge` are provided, an itemised fee breakdown
 * is rendered above the button.
 */
export default function PayMongoButton({
  jobId,
  amountPHP,
  escrowFee,
  processingFee,
  urgencyFee,
  platformServiceFee,
  totalCharge,
  onSimulated,
  className = "",
  label = "Fund Escrow",
}: PayMongoButtonProps) {
  const [loading, setLoading] = useState(false);

  const showBreakdown =
    escrowFee !== undefined && escrowFee > 0 && totalCharge !== undefined;

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
    <div className="flex flex-col gap-2">
      {showBreakdown && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center gap-1.5 mb-2 text-muted-foreground font-medium">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Payment breakdown
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Service price</span>
              <span>₱{amountPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                Escrow protection fee
                <span className="text-xs text-muted-foreground/70">(non-refundable)</span>
              </span>
              <span>₱{escrowFee!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {processingFee !== undefined && processingFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Processing fee
                  <span className="text-xs text-muted-foreground/70">(non-refundable)</span>
                </span>
                <span>₱{processingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {urgencyFee !== undefined && urgencyFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Urgent booking fee
                  <span className="text-xs text-muted-foreground/70">(non-refundable)</span>
                </span>
                <span>₱{urgencyFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {platformServiceFee !== undefined && platformServiceFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Platform service fee
                  <span className="text-xs text-muted-foreground/70">(non-refundable)</span>
                </span>
                <span>₱{platformServiceFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
              <span>Total</span>
              <span>₱{totalCharge!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

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
              ₱{(totalCharge ?? amountPHP).toLocaleString()}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
