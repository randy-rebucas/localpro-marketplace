"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface Props {
  userId: string;
  isVerified: boolean;
  isSuspended: boolean;
}

export default function UserActions({ userId, isVerified, isSuspended }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function update(patch: { isVerified?: boolean; isSuspended?: boolean }) {
    const key = Object.keys(patch)[0];
    setLoading(key);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
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
    <div className="flex gap-2">
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
