"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  withdrawalId: string;
  currentStatus: "pending" | "processing" | "completed" | "rejected";
}

export default function WithdrawalActions({ withdrawalId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  async function update(status: "processing" | "completed" | "rejected") {
    setLoading(status);
    try {
      const res = await apiFetch(`/api/admin/wallet/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update"); return; }
      toast.success(`Withdrawal marked as ${status}`);
      setNotes("");
      setShowNotes(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {showNotes && (
        <textarea
          className="input w-full min-h-[64px] resize-none text-sm"
          placeholder="Optional notes (e.g. reference number, rejection reason…)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          autoFocus
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {currentStatus === "pending" && (
          <Button
            size="sm"
            variant="secondary"
            isLoading={loading === "processing"}
            disabled={!!loading}
            onClick={() => { setShowNotes(true); update("processing"); }}
          >
            <Loader2 className="h-3.5 w-3.5 mr-1.5" />
            Mark Processing
          </Button>
        )}
        <Button
          size="sm"
          isLoading={loading === "completed"}
          disabled={!!loading}
          onClick={() => { setShowNotes(true); update("completed"); }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Mark Completed
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="border-red-200 text-red-600 hover:bg-red-50"
          isLoading={loading === "rejected"}
          disabled={!!loading}
          onClick={() => { setShowNotes(true); update("rejected"); }}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Reject
        </Button>
        {!showNotes && (
          <button
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 ml-1"
            onClick={() => setShowNotes(true)}
          >
            Add notes
          </button>
        )}
      </div>
    </div>
  );
}
