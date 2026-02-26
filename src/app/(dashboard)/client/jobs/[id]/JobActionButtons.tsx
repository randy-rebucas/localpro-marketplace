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

export default function JobActionButtons({ jobId, status, escrowStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function patchJob(endpoint: string, label: string) {
    setLoading(label);
    try {
      const res = await fetch(endpoint, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
      toast.success(data.message ?? "Done");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "assigned" && escrowStatus === "not_funded" && (
        <Button
          isLoading={loading === "fund"}
          onClick={() => patchJob(`/api/jobs/${jobId}/fund`, "fund")}
        >
          Fund Escrow
        </Button>
      )}

      {status === "completed" && escrowStatus === "funded" && (
        <Button
          isLoading={loading === "complete"}
          onClick={() => patchJob(`/api/jobs/${jobId}/complete`, "complete")}
        >
          Approve & Release Payment
        </Button>
      )}
    </div>
  );
}
