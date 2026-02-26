"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { DisputeStatus } from "@/types";

interface Props {
  disputeId: string;
  currentStatus: DisputeStatus;
  escrowStatus?: string;
}

export default function DisputeActions({ disputeId, currentStatus, escrowStatus }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [escrowAction, setEscrowAction] = useState<"release" | "refund">("release");
  const [loading, setLoading] = useState<string | null>(null);

  async function update(status: DisputeStatus, action?: "release" | "refund") {
    setLoading(status);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolutionNotes: notes || undefined,
          escrowAction: action,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update"); return; }
      toast.success(`Dispute ${status}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Resolution Notes (optional)</label>
        <textarea className="input w-full min-h-[80px] resize-none text-sm"
          placeholder="Add resolution notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {currentStatus === "open" && (
          <Button size="sm" variant="outline" isLoading={loading === "investigating"}
            onClick={() => update("investigating")}>
            Mark Investigating
          </Button>
        )}

        {escrowStatus === "funded" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Escrow:</label>
            <select className="input py-1 text-xs"
              value={escrowAction}
              onChange={(e) => setEscrowAction(e.target.value as "release" | "refund")}>
              <option value="release">Release to provider</option>
              <option value="refund">Refund to client</option>
            </select>
          </div>
        )}

        <Button size="sm" isLoading={loading === "resolved"}
          onClick={() => update("resolved", escrowStatus === "funded" ? escrowAction : undefined)}>
          Resolve Dispute
        </Button>
      </div>
    </div>
  );
}
