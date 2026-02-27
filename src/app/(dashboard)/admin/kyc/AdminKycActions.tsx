"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

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
      toast.error("Please provide a rejection reason");
      return;
    }

    action === "approve" ? setIsApproving(true) : setIsRejecting(true);
    try {
      const res = await fetch(`/api/admin/kyc/${userId}`, {
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

  return (
    <div className="space-y-2">
      {showRejectReason && (
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Rejection reason (e.g. blurry ID, expired document)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setShowRejectReason(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleAction("reject")} isLoading={isRejecting}>
            Confirm Reject
          </Button>
        </div>
      )}
      {!showRejectReason && (
        <div className="flex gap-2">
          <Button onClick={() => handleAction("approve")} isLoading={isApproving} className="flex-1">
            ✓ Approve
          </Button>
          <Button variant="danger" onClick={() => handleAction("reject")} isLoading={isRejecting} className="flex-1">
            ✗ Reject
          </Button>
        </div>
      )}
    </div>
  );
}
