"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ShieldAlert } from "lucide-react";

interface Props {
  jobId: string;
  escrowStatus: string;
}

export default function AdminEscrowOverride({ jobId, escrowStatus }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"release" | "refund">("release");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (escrowStatus !== "funded") return null;

  async function handleSubmit() {
    if (reason.trim().length < 5) {
      toast.error("Please provide a reason (at least 5 characters)");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/escrow-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Override failed"); return; }
      toast.success(data.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
      >
        <ShieldAlert className="h-4 w-4" />
        Escrow Override
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Admin Escrow Override">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Manually release or refund the escrow for this job. This action is logged and
            notifications will be sent to all parties.
          </p>

          <div>
            <label className="label block mb-2">Action</label>
            <div className="flex gap-3">
              <button
                onClick={() => setAction("release")}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  action === "release"
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✓ Release to Provider
              </button>
              <button
                onClick={() => setAction("refund")}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  action === "refund"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ↩ Refund to Client
              </button>
            </div>
          </div>

          <div>
            <label className="label block mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea
              className="input w-full min-h-[80px] resize-none"
              placeholder="e.g. Job completed but system failed to auto-release due to dispute resolution"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant={action === "release" ? "primary" : "danger"}
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              Confirm {action === "release" ? "Release" : "Refund"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
