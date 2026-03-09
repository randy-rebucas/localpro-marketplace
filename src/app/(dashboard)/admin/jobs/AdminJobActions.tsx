"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { apiFetch } from "@/lib/fetchClient";
import { AlertTriangle } from "lucide-react";

interface Props {
  jobId: string;
  riskScore: number;
}

export default function AdminJobActions({ jobId, riskScore }: Props) {
  const router = useRouter();
  const [rejectModal, setRejectModal]     = useState(false);
  const [rejectReason, setRejectReason]   = useState("");
  const [confirmHigh, setConfirmHigh]     = useState(false);
  const [adjustedRisk, setAdjustedRisk]   = useState(riskScore);
  const [loading, setLoading]             = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (rejectModal) setTimeout(() => textareaRef.current?.focus(), 80);
    else setRejectReason("");
  }, [rejectModal]);

  async function doApprove() {
    setLoading("approve");
    setConfirmHigh(false);
    try {
      const res = await apiFetch(`/api/admin/jobs/${jobId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskScore: adjustedRisk }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to approve"); return; }
      toast.success("Job approved and published");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  function handleApproveClick() {
    // Require explicit confirmation for high-risk jobs
    if (adjustedRisk > 60 && !confirmHigh) { setConfirmHigh(true); return; }
    doApprove();
  }

  async function reject() {
    if (!rejectReason || rejectReason.length < 10) {
      toast.error("Please provide a reason (min 10 chars)"); return;
    }
    setLoading("reject");
    try {
      const res = await apiFetch(`/api/admin/jobs/${jobId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to reject"); return; }
      toast.success("Job rejected");
      setRejectModal(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  const riskColor =
    adjustedRisk > 60 ? "text-red-600" :
    adjustedRisk > 30 ? "text-amber-600" : "text-green-600";

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Risk score adjuster */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Risk override:</label>
          <input
            type="number" min="0" max="100" step="1"
            className={`input w-20 text-sm py-1 font-semibold ${riskColor}`}
            value={adjustedRisk}
            onChange={(e) => {
              setAdjustedRisk(Math.min(100, Math.max(0, Math.round(Number(e.target.value)))));
              setConfirmHigh(false);
            }}
          />
        </div>

        <div className="flex gap-2 ml-auto flex-wrap">
          {/* High-risk confirm step */}
          {confirmHigh ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-xs text-red-700 font-medium">High-risk job — confirm?</span>
              <button
                onClick={() => setConfirmHigh(false)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >Cancel</button>
              <Button size="sm" isLoading={loading === "approve"} onClick={doApprove}>
                Yes, Approve
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="danger" size="sm" isLoading={loading === "reject"}
                onClick={() => setRejectModal(true)}
              >
                Reject
              </Button>
              <Button size="sm" isLoading={loading === "approve"} onClick={handleApproveClick}>
                Approve & Publish
              </Button>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Job">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Provide a reason — the client will be notified so they can correct and resubmit.
          </p>
          <div>
            <label className="label block mb-1">Reason <span className="text-slate-400 font-normal">(min 10 chars)</span></label>
            <textarea
              ref={textareaRef}
              rows={4}
              className="input w-full resize-none"
              placeholder="This job was rejected because…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); reject(); }
                if (e.key === "Escape") { e.preventDefault(); setRejectModal(false); }
              }}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {rejectReason.length}/10 min chars · Ctrl+Enter to submit · Esc to cancel
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="danger" isLoading={loading === "reject"} onClick={reject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
