"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import Modal from "@/components/ui/Modal";
import { calculateCommission, getCommissionRate, calculateClientFees, DEFAULT_ESCROW_FEE_RATE_PERCENT, DEFAULT_PROCESSING_FEE_RATE_PERCENT, DEFAULT_PLATFORM_SERVICE_FEE_RATE_PERCENT } from "@/lib/commission";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, Wallet } from "lucide-react";
import type { JobStatus, EscrowStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  budget: number;
  acceptedAmount?: number;
  fundedAmount?: number;
  category?: string;
  urgencyFee?: number;
  urgency?: string;
}

export default function JobActionButtons({ jobId, status, escrowStatus, budget, acceptedAmount, fundedAmount, category, urgencyFee, urgency }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Satisfaction checklist — all three must be ticked before release is allowed
  const [checkWorkCompleted,     setCheckWorkCompleted]     = useState(false);
  const [checkIssuesResolved,    setCheckIssuesResolved]    = useState(false);
  const [checkReadyToRelease,    setCheckReadyToRelease]    = useState(false);
  const allChecked = checkWorkCompleted && checkIssuesResolved && checkReadyToRelease;

  function openReleaseModal() {
    setCheckWorkCompleted(false);
    setCheckIssuesResolved(false);
    setCheckReadyToRelease(false);
    setShowReleaseModal(true);
  }
  const [amountInput, setAmountInput] = useState<string>(
    String(acceptedAmount ?? budget)
  );

  const parsedAmount = useMemo(() => {
    const v = parseFloat(amountInput);
    return isNaN(v) || v <= 0 ? 0 : v;
  }, [amountInput]);

  const commissionRate = getCommissionRate(category);
  const breakdown = useMemo(() => calculateCommission(parsedAmount || budget, commissionRate), [parsedAmount, budget, commissionRate]);
  const releaseBreakdown = useMemo(() => calculateCommission(fundedAmount ?? budget, commissionRate), [fundedAmount, budget, commissionRate]);
  const clientFees = useMemo(
    () => calculateClientFees(parsedAmount || budget, DEFAULT_ESCROW_FEE_RATE_PERCENT, DEFAULT_PROCESSING_FEE_RATE_PERCENT, urgencyFee ?? 0, DEFAULT_PLATFORM_SERVICE_FEE_RATE_PERCENT),
    [parsedAmount, budget, urgencyFee]
  );

  useEffect(() => {
    apiFetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => setWalletBalance(d.balance ?? 0))
      .catch(() => setWalletBalance(0));
  }, []);

  function openFundModal() {
    setAmountInput(String(acceptedAmount ?? budget));
    setShowFundModal(true);
  }

  async function fundFromWallet() {
    const amount = acceptedAmount ?? budget;
    setLoading("wallet");
    setShowWalletModal(false);
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/fund-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to fund from wallet"); return; }
      toast.success(data.message ?? "Escrow funded from wallet");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function fundEscrow() {
    if (parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setLoading("fund");
    setShowFundModal(false);
    try {
      // H9: Do NOT send an amount — the server always uses job.budget.
      // Sending a client-supplied amount was a security risk (underpayment).
      const res = await apiFetch(`/api/jobs/${jobId}/fund`, {
        method: "PATCH",
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

  async function cancelJob() {
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    setLoading("cancel");
    setShowCancelModal(false);
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to cancel job"); return; }
      toast.success(data.message ?? "Job cancelled");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
      setCancelReason("");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {status === "assigned" && escrowStatus === "not_funded" && (
          <>
            <Button
              isLoading={loading === "fund"}
              onClick={openFundModal}
            >
              Fund Escrow
            </Button>
            {walletBalance !== null && walletBalance >= (acceptedAmount ?? budget) && (
              <Button
                variant="secondary"
                isLoading={loading === "wallet"}
                onClick={() => setShowWalletModal(true)}
                className="flex items-center gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Wallet className="h-4 w-4" />
                Pay from Wallet ({formatCurrency(walletBalance)})
              </Button>
            )}
          </>
        )}

        {status === "completed" && escrowStatus === "funded" && (
          <Button
            isLoading={loading === "complete"}
            onClick={openReleaseModal}
          >
            Approve &amp; Release Payment
          </Button>
        )}

        {/* Close Job — allowed on open or assigned (before work starts) */}
        {(status === "open" || status === "assigned") && (
          <Button
            variant="secondary"
            isLoading={loading === "cancel"}
            onClick={() => { setCancelReason(""); setShowCancelModal(true); }}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            Close Job
          </Button>
        )}
      </div>

      {/* Cancel / Close Job Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Close Job"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-0.5">Are you sure you want to close this job?</p>
              {escrowStatus === "funded" ? (
                <p className="text-xs text-red-600">Escrow is currently funded — your payment will be refunded when you close the job.</p>
              ) : status === "assigned" ? (
                <p className="text-xs text-red-600">A provider has already been assigned. They will be notified.</p>
              ) : (
                <p className="text-xs text-red-600">All pending quotes will be rejected and the job will be removed from the marketplace.</p>
              )}
            </div>
          </div>

          <div>
            <label className="label block mb-1">Reason for closing</label>
            <textarea
              className="input w-full min-h-[80px] resize-none"
              placeholder="e.g. Found another provider externally, no longer need the service…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCancelModal(false)}
              disabled={loading === "cancel"}
            >
              Keep Job
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              isLoading={loading === "cancel"}
              disabled={cancelReason.trim().length < 5}
              onClick={cancelJob}
            >
              Confirm Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pay from Wallet Confirmation Modal */}
      <Modal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        title="Pay from Wallet"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-violet-50 border border-violet-200 px-4 py-3">
            <Wallet className="h-5 w-5 text-violet-600 flex-shrink-0" />
            <div className="text-sm font-medium text-violet-800">
              <p>Your wallet balance: <span className="font-bold">{formatCurrency(walletBalance ?? 0)}</span></p>
              <p className="text-xs font-normal text-violet-600 mt-0.5">
                {formatCurrency(acceptedAmount ?? budget)} will be deducted to fund escrow for this job.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowWalletModal(false)}
              disabled={loading === "wallet"}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700 focus:ring-violet-500"
              isLoading={loading === "wallet"}
              onClick={fundFromWallet}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

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
          {/* Satisfaction checklist */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm before releasing</p>
            {([
              { id: "check-completed",    state: checkWorkCompleted,  setter: setCheckWorkCompleted,  label: "Work was completed as described in the job post" },
              { id: "check-issues",       state: checkIssuesResolved, setter: setCheckIssuesResolved, label: "All issues or concerns have been addressed" },
              { id: "check-ready",        state: checkReadyToRelease, setter: setCheckReadyToRelease, label: "I am satisfied and ready to release payment" },
            ] as const).map(({ id, state, setter, label }) => (
              <label key={id} className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  id={id}
                  checked={state}
                  onChange={(e) => setter(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-violet-600"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
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
              disabled={!allChecked}
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
                readOnly
                className="input w-full pl-7 bg-slate-50 cursor-not-allowed text-slate-600"
                value={amountInput}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Amount is set by the accepted quote and cannot be changed here.
            </p>
          </div>

          {/* Breakdown */}
          <div className="rounded-lg border border-slate-200 overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 bg-slate-50">
              <span className="text-slate-500">Service price</span>
              <span className="font-semibold text-slate-900">{formatCurrency(breakdown.gross)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                Escrow protection fee ({DEFAULT_ESCROW_FEE_RATE_PERCENT}%)
                <span className="text-xs text-slate-400">(non-refundable)</span>
              </span>
              <span className="text-slate-700">+{formatCurrency(clientFees.escrowFee)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                Payment processing fee ({DEFAULT_PROCESSING_FEE_RATE_PERCENT}%)
                <span className="text-xs text-slate-400">(non-refundable)</span>
              </span>
              <span className="text-slate-700">+{formatCurrency(clientFees.processingFee)}</span>
            </div>
            {(urgencyFee ?? 0) > 0 && (
              <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  Urgent booking fee ({urgency === "rush" ? "2-hr rush" : "same day"})
                  <span className="text-xs text-slate-400">(non-refundable)</span>
                </span>
                <span className="text-slate-700">+{formatCurrency(urgencyFee ?? 0)}</span>
              </div>
            )}
            {clientFees.platformServiceFee > 0 && (
              <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  Platform service fee ({DEFAULT_PLATFORM_SERVICE_FEE_RATE_PERCENT}%)
                  <span className="text-xs text-slate-400">(non-refundable)</span>
                </span>
                <span className="text-slate-700">+{formatCurrency(clientFees.platformServiceFee)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
              <span className="text-slate-500">Platform commission ({(breakdown.rate * 100).toFixed(0)}%)</span>
              <span className="text-slate-700">−{formatCurrency(breakdown.commission)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <span className="font-medium text-slate-700">Provider receives</span>
              <span className="font-bold text-slate-900">{formatCurrency(breakdown.netAmount)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 border-t-2 border-primary/20 bg-primary/5">
              <span className="font-semibold text-slate-800">Total charged to you</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(clientFees.totalCharge)}</span>
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
