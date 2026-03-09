"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import { Check, X } from "lucide-react";

export default function AdminKycActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [reason, setReason] = useState("");

  async function handleAction(action: "approve" | "reject") {
    if (action === "reject" && !showRejectReason) {
      setShowRejectReason(true);
      return;
    }
    if (action === "reject" && reason.trim().length < 5) {
      toast.error("Please provide a rejection reason (min. 5 characters)");
      return;
    }

    action === "approve" ? setIsApproving(true) : setIsRejecting(true);
    try {
      const res = await apiFetch(`/api/admin/kyc/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
      toast.success(data.message);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsApproving(false);
      setIsRejecting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAction("reject");
    }
    if (e.key === "Escape") {
      setShowRejectReason(false);
      setReason("");
    }
  }

  return (
    <div className="space-y-2">
      {showRejectReason && (
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={2}
            className="input w-full text-sm resize-none"
            placeholder="Rejection reason, e.g. blurry ID, expired document… (Ctrl+Enter to submit)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setShowRejectReason(false); setReason(""); }} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleAction("reject")} isLoading={isRejecting} className="flex-1">
              <X className="h-3.5 w-3.5" /> Confirm Reject
            </Button>
          </div>
        </div>
      )}
      {!showRejectReason && (
        <div className="flex gap-2">
          <Button onClick={() => handleAction("approve")} isLoading={isApproving} className="flex-1">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button variant="danger" onClick={() => handleAction("reject")} isLoading={isRejecting} className="flex-1">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}
