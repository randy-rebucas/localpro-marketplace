"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { apiFetch } from "@/lib/fetchClient";

interface Props {
  jobId: string;
  riskScore: number;
}

export default function AdminJobActions({ jobId, riskScore }: Props) {
  const router = useRouter();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adjustedRisk, setAdjustedRisk] = useState(riskScore);
  const [loading, setLoading] = useState<string | null>(null);

  async function approve() {
    setLoading("approve");
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

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Risk Score (0-100):</label>
          <input type="number" min="0" max="100" step="1"
            className="input w-20 text-sm py-1"
            value={adjustedRisk}
            onChange={(e) => setAdjustedRisk(Math.min(100, Math.max(0, Math.round(Number(e.target.value)))))} />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="danger" size="sm" isLoading={loading === "reject"}
            onClick={() => setRejectModal(true)}>
            Reject
          </Button>
          <Button size="sm" isLoading={loading === "approve"} onClick={approve}>
            Approve & Publish
          </Button>
        </div>
      </div>

      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Job">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Please provide a reason for rejection.</p>
          <div>
            <label className="label block mb-1">Reason</label>
            <textarea className="input w-full min-h-[100px] resize-none"
              placeholder="This job was rejected because..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="danger" isLoading={loading === "reject"} onClick={reject}>Confirm Rejection</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
