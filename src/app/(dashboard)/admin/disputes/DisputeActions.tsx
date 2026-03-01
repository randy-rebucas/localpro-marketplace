"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { DisputeStatus } from "@/types";
import { apiFetch } from "@/lib/fetchClient";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  disputeId: string;
  currentStatus: DisputeStatus;
  escrowStatus?: string;
  jobTitle?: string;
  reason?: string;
  raisedByRole?: string;
}

export default function DisputeActions({ disputeId, currentStatus, escrowStatus, jobTitle, reason, raisedByRole }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [escrowAction, setEscrowAction] = useState<"release" | "refund">("release");
  const [loading, setLoading] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  async function summarizeDispute() {
    setSummarizing(true);
    setSummary(null);
    setSummaryExpanded(true);
    try {
      const res = await apiFetch("/api/ai/summarize-dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, jobTitle, raisedByRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Could not summarize dispute"); return; }
      setSummary(data.summary);
    } catch {
      toast.error("Could not reach AI service.");
    } finally {
      setSummarizing(false);
    }
  }

  async function update(status: DisputeStatus, action?: "release" | "refund") {
    setLoading(status);
    try {
      const res = await apiFetch(`/api/admin/disputes/${disputeId}`, {
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
      toast.success(status === "resolved" ? "Dispute resolved" : "Dispute marked as investigating");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* AI Summary */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={summarizeDispute}
          disabled={summarizing}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50 transition-colors"
        >
          {summarizing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {summarizing ? "Summarizing…" : "AI Summary"}
        </button>
        {summary && (
          <button
            type="button"
            onClick={() => setSummaryExpanded((v) => !v)}
            className="text-slate-400 hover:text-slate-600"
          >
            {summaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {summary && summaryExpanded && (
        <div className="p-3 rounded-lg bg-violet-50 border border-violet-100 text-sm text-violet-800">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide mb-1">AI Neutral Summary</p>
          {summary}
        </div>
      )}
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
