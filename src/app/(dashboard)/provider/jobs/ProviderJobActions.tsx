"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { JobStatus, EscrowStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
}

export default function ProviderJobActions({ jobId, status, escrowStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markComplete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/mark-complete`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("Job marked as completed. Awaiting client approval.");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (status === "completed") {
    return <p className="text-xs text-slate-400">Awaiting client approval and escrow release.</p>;
  }

  if (escrowStatus !== "funded") {
    return <p className="text-xs text-amber-600">⚠ Waiting for client to fund escrow before you can mark complete.</p>;
  }

  return (
    <Button size="sm" isLoading={loading} onClick={markComplete}>
      Mark as Completed
    </Button>
  );
}
