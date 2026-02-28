"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";

interface Props {
  userId: string;
  role: string;
  isVerified: boolean;
  isSuspended: boolean;
  approvalStatus: string;
}

export default function UserActions({ userId, role, isVerified, isSuspended, approvalStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function update(patch: Record<string, unknown>) {
    const key = Object.entries(patch).map(([k, v]) => `${k}_${v}`).join(",");
    setLoading(key);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("User updated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Provider approval buttons */}
      {role === "provider" && approvalStatus === "pending_approval" && (
        <>
          <Button
            size="sm"
            isLoading={loading === "approvalStatus_approved"}
            onClick={() => update({ approvalStatus: "approved" })}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            isLoading={loading === "approvalStatus_rejected"}
            onClick={() => update({ approvalStatus: "rejected" })}
          >
            Reject
          </Button>
        </>
      )}
      {role === "provider" && approvalStatus === "rejected" && (
        <Button
          size="sm"
          variant="secondary"
          isLoading={loading === "approvalStatus_approved"}
          onClick={() => update({ approvalStatus: "approved" })}
        >
          Re-approve
        </Button>
      )}

      {/* Verify / Suspend */}
      <Button size="sm" variant="outline"
        isLoading={loading === "isVerified"}
        onClick={() => update({ isVerified: !isVerified })}>
        {isVerified ? "Unverify" : "Verify"}
      </Button>
      <Button size="sm" variant={isSuspended ? "secondary" : "danger"}
        isLoading={loading === "isSuspended"}
        onClick={() => update({ isSuspended: !isSuspended })}>
        {isSuspended ? "Unsuspend" : "Suspend"}
      </Button>
    </div>
  );
}
