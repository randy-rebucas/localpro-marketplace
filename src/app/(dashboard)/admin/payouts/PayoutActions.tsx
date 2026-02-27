"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { PayoutStatus } from "@/types";

interface Props {
  payoutId: string;
  currentStatus: PayoutStatus;
}

export default function PayoutActions({ payoutId, currentStatus }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function update(status: PayoutStatus) {
    setLoading(status);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update payout");
        return;
      }
      toast.success(`Payout marked as ${status}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (currentStatus === "completed" || currentStatus === "rejected") {
    return (
      <p className="text-xs text-slate-400 italic">No further actions</p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">
          Admin Notes <span className="text-slate-400">(optional; required for rejection)</span>
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none min-h-[72px]"
          placeholder="Add notes for the provider..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {currentStatus === "pending" && (
          <Button
            size="sm"
            variant="outline"
            isLoading={loading === "processing"}
            onClick={() => update("processing")}
          >
            Mark Processing
          </Button>
        )}
        {(currentStatus === "pending" || currentStatus === "processing") && (
          <>
            <Button
              size="sm"
              isLoading={loading === "completed"}
              onClick={() => update("completed")}
            >
              Mark Completed
            </Button>
            <Button
              size="sm"
              variant="outline"
              isLoading={loading === "rejected"}
              onClick={() => {
                if (!notes.trim()) {
                  toast.error("Please add a note explaining the rejection reason.");
                  return;
                }
                update("rejected");
              }}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
