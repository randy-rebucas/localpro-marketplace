"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import { calculateCommission } from "@/lib/commission";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";
import Modal from "@/components/ui/Modal";

export default function QuoteAcceptButton({
  quoteId,
  proposedAmount,
  providerName,
}: {
  quoteId: string;
  proposedAmount: number;
  providerName: string;
}) {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const breakdown = calculateCommission(proposedAmount);

  async function accept() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/quotes/${quoteId}/accept`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to accept quote"); return; }
      toast.success("Quote accepted! Provider has been assigned.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
        onClick={() => setOpen(true)}
      >
        Accept
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Accept Quote" size="sm">
        <div className="p-6 space-y-4">
          {/* Trust label */}
          <div className="flex items-start gap-2.5 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-green-800">
              Payment Secured by LocalPro — funds are held in escrow until you approve the completed work.
            </p>
          </div>

          <p className="text-sm text-slate-600">
            You&apos;re assigning <span className="font-semibold text-slate-900">{providerName}</span> to this job.
            You&apos;ll be prompted to fund escrow next.
          </p>

          {/* Fee breakdown */}
          <div className="rounded-lg border border-slate-200 overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 bg-slate-50">
              <span className="text-slate-500">Quoted amount</span>
              <span className="font-semibold text-slate-900">{formatCurrency(breakdown.gross)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100">
              <span className="text-slate-500">Platform fee ({(breakdown.rate * 100).toFixed(0)}%)</span>
              <span className="text-slate-500">−{formatCurrency(breakdown.commission)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <span className="text-slate-600">Provider receives</span>
              <span className="font-semibold text-slate-800">{formatCurrency(breakdown.netAmount)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 border-t-2 border-primary/20 bg-primary/5">
              <span className="font-semibold text-slate-800">Total charged to you</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(breakdown.gross)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={accept}
              disabled={loading}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Accepting…" : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
