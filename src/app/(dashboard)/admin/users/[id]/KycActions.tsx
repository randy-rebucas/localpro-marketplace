"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle, RotateCcw, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

interface Props {
  userId: string;
  kycStatus: "none" | "pending" | "approved" | "rejected";
}

export default function KycActions({ userId, kycStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  if (kycStatus === "none") return null;

  async function act(action: "approve" | "reject") {
    if (action === "reject" && !reason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    setLoading(action);
    try {
      const res = await apiFetch(`/api/admin/kyc/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success(`KYC ${action === "approve" ? "approved" : "rejected"}`);
      setShowRejectForm(false);
      setReason("");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (kycStatus === "approved") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <CheckCircle2 size={13} />
        KYC approved — no further action needed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {kycStatus === "pending" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => act("approve")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {loading === "approve"
              ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <CheckCircle2 size={13} />}
            Approve KYC
          </button>
          <button
            onClick={() => setShowRejectForm((v) => !v)}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <XCircle size={13} />
            Reject
            <ChevronDown size={11} className={`transition-transform ${showRejectForm ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {kycStatus === "rejected" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => act("approve")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {loading === "approve"
              ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <RotateCcw size={13} />}
            Override &amp; Approve
          </button>
        </div>
      )}

      {/* Rejection reason form */}
      {showRejectForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <label className="text-xs font-medium text-red-700">Rejection reason (sent to provider)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Documents are blurry or expired. Please resubmit clear, valid government-issued ID."
            className="w-full text-xs rounded-lg border border-red-200 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act("reject")}
              disabled={!!loading || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {loading === "reject"
                ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <XCircle size={13} />}
              Confirm Rejection
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setReason(""); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
