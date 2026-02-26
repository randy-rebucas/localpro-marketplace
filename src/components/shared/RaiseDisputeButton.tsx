"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { JobStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
}

const ELIGIBLE_STATUSES: JobStatus[] = ["assigned", "in_progress", "completed"];

export default function RaiseDisputeButton({ jobId, status }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ELIGIBLE_STATUSES.includes(status)) return null;

  async function submit() {
    if (reason.trim().length < 20) {
      toast.error("Please provide at least 20 characters describing the issue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to raise dispute");
        return;
      }
      toast.success("Dispute raised. Admin will review shortly.");
      setOpen(false);
      setReason("");
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
        onClick={() => setOpen(true)}
        className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
      >
        Raise a dispute
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Raise a Dispute</h3>
              <p className="text-sm text-slate-500 mt-1">
                Describe the issue clearly. An admin will review and resolve the dispute.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Reason <span className="text-slate-400">(min. 20 characters)</span>
              </label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Provider did not complete the work as agreed..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{reason.trim().length} / 20 min</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setOpen(false); setReason(""); }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <Button
                size="sm"
                isLoading={loading}
                onClick={submit}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                Submit Dispute
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
