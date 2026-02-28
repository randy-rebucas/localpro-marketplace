"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import Modal from "@/components/ui/Modal";
import { calculateCommission } from "@/lib/commission";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import type { JobStatus, EscrowStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  budget: number;
}

export default function JobActionButtons({ jobId, status, escrowStatus, budget }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  const breakdown = calculateCommission(budget);

  async function fundEscrow() {
    setLoading("fund");
    setShowFundModal(false);
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/fund`, { method: "PATCH" });
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
            onClick={() => setShowFundModal(true)}
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
            <p className="text-sm font-medium text-blue-800">
              This will release <span className="font-bold">{formatCurrency(breakdown.netAmount)}</span> to the provider. This action cannot be undone.
            </p>
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
          <p className="text-sm text-slate-600">
            The amount will be held securely and released to the provider only after you confirm the work is complete.
          </p>

          {/* Breakdown */}
          <div className="rounded-lg border border-slate-200 overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 bg-slate-50">
              <span className="text-slate-500">Job budget</span>
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
            >
              Confirm &amp; Fund
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
