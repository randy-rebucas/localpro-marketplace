"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import Modal from "@/components/ui/Modal";
import { calculateCommission } from "@/lib/commission";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck, Info } from "lucide-react";
import type { JobStatus, EscrowStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  budget: number;
  acceptedAmount?: number;
  fundedAmount?: number;
}

export default function JobActionButtons({ jobId, status, escrowStatus, budget, acceptedAmount, fundedAmount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [amountInput, setAmountInput] = useState<string>(
    String(acceptedAmount ?? budget)
  );

  const parsedAmount = useMemo(() => {
    const v = parseFloat(amountInput);
    return isNaN(v) || v <= 0 ? 0 : v;
  }, [amountInput]);

  const breakdown = useMemo(() => calculateCommission(parsedAmount || budget), [parsedAmount, budget]);
  const releaseBreakdown = useMemo(() => calculateCommission(fundedAmount ?? budget), [fundedAmount, budget]);

  function openFundModal() {
    setAmountInput(String(acceptedAmount ?? budget));
    setShowFundModal(true);
  }

  async function fundEscrow() {
    if (parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setLoading("fund");
    setShowFundModal(false);
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/fund`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to fund escrow");
        return;
      }
      if (data.checkoutUrl) {
        // Live PayMongo — redirect to hosted checkout
        window.location.href = data.checkoutUrl;
        return;
      }
      // Simulated (dev) — escrow already funded
      toast.success(data.message ?? "Escrow funded");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function releaseEscrow() {
    setLoading("complete");
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/complete`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
      toast.success(data.message ?? "Payment released to provider");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {status === "assigned" && escrowStatus === "not_funded" && (
          <Button
            isLoading={loading === "fund"}
            onClick={openFundModal}
          >
            Fund Escrow
          </Button>
        )}

        {status === "completed" && escrowStatus === "funded" && (
          <Button
            isLoading={loading === "complete"}
            onClick={() => setShowReleaseModal(true)}
          >
            Approve &amp; Release Payment
          </Button>
        )}
      </div>

      {/* Release Payment Confirmation Modal */}
      <Modal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        title="Release Payment"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm font-medium text-blue-800">
              <p>This will release <span className="font-bold">{formatCurrency(releaseBreakdown.netAmount)}</span> to the provider. This action cannot be undone.</p>
              {fundedAmount !== undefined && fundedAmount !== budget && (
                <p className="text-xs font-normal text-blue-600 mt-1">Based on funded amount of {formatCurrency(fundedAmount)} (budget: {formatCurrency(budget)})</p>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Only confirm if you are satisfied with the completed work. Once released, funds cannot be recovered.
          </p>
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowReleaseModal(false)}
              disabled={loading === "complete"}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              isLoading={loading === "complete"}
              onClick={() => { setShowReleaseModal(false); releaseEscrow(); }}
            >
              Confirm Release
            </Button>
          </div>
        </div>
      </Modal>

      {/* Escrow Confirmation Modal */}
      <Modal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        title="Fund Escrow"
        size="sm"
      >
        <div className="p-6 space-y-4">
          {/* Trust label */}
          <div className="flex items-center gap-2.5 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">
              Payment Secured by LocalPro — funds are held in escrow and only released when you approve.
            </p>
          </div>

          {/* Amount input */}
          <div>
            <label className="label block mb-1">
              Escrow Amount
              {acceptedAmount !== undefined && acceptedAmount !== budget && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (quoted: {formatCurrency(acceptedAmount)})
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₱</span>
              <input
                type="number"
                min="1"
                step="1"
                className="input w-full pl-7"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
            {acceptedAmount !== undefined && parsedAmount !== acceptedAmount && parsedAmount > 0 && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                <Info className="h-3 w-3 flex-shrink-0" />
                Differs from quoted amount ({formatCurrency(acceptedAmount)})
                <button
                  type="button"
                  className="ml-1 underline hover:no-underline"
                  onClick={() => setAmountInput(String(acceptedAmount))}
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="rounded-lg border border-slate-200 overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 bg-slate-50">
              <span className="text-slate-500">Escrow amount</span>
              <span className="font-semibold text-slate-900">{formatCurrency(breakdown.gross)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
              <span className="text-slate-500">Platform fee ({(breakdown.rate * 100).toFixed(0)}%)</span>
              <span className="text-slate-700">−{formatCurrency(breakdown.commission)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <span className="font-medium text-slate-700">Provider receives</span>
              <span className="font-bold text-slate-900">{formatCurrency(breakdown.netAmount)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 border-t-2 border-primary/20 bg-primary/5">
              <span className="font-semibold text-slate-800">Total charged to you</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(breakdown.gross)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowFundModal(false)}
              disabled={loading === "fund"}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              isLoading={loading === "fund"}
              onClick={fundEscrow}
              disabled={parsedAmount <= 0}
            >
              Confirm &amp; Fund
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
