"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { UserX } from "lucide-react";
import type { JobStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  providerName?: string;
}

/**
 * Admin control to force-remove a provider from an assigned or in-progress job
 * and re-open it to the board, regardless of escrow state.
 */
export default function AdminForceWithdraw({ jobId, status, providerName }: Props) {
  const router = useRouter();
  const t = useTranslations("adminForceWithdraw");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Only shown when a provider is assigned
  if (!["assigned", "in_progress"].includes(status)) return null;

  async function handleSubmit() {
    if (reason.trim().length < 5) {
      toast.error(t("reasonTooShort"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/force-withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t("withdrawFailed")); return; }
      toast.success(data.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setReason(""); setOpen(true); }}
        className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
      >
        <UserX className="h-4 w-4" />
        {t("triggerBtn")}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("modalTitle")}>
        <div className="space-y-4">
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <p className="font-semibold mb-0.5">{t("warningTitle")}</p>
            <p>
              {providerName ? (
                <><strong>{providerName}</strong>{" "}{t("warningBodyNamedSuffix")}</>
              ) : (
                t("warningBodyGeneric")
              )}{" "}
              {t("warningBodyTrail")}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700" htmlFor="fw-reason">
              {t("reasonLabel")} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="fw-reason"
              rows={3}
              className="input w-full resize-none"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isLoading}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={reason.trim().length < 5}
            >
              {t("confirmBtn")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
