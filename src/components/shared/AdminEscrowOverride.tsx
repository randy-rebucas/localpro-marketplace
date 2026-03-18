"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("adminEscrowOverride");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"release" | "refund">("release");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (escrowStatus !== "funded") return null;

  async function handleSubmit() {
    if (reason.trim().length < 5) {
      toast.error(t("reasonTooShort"));
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
      if (!res.ok) { toast.error(data.error ?? t("overrideFailed")); return; }
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
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
      >
        <ShieldAlert className="h-4 w-4" />
        {t("triggerBtn")}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("modalTitle")}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("description")}
          </p>

          <div>
            <label className="label block mb-2">{t("actionLabel")}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setAction("release")}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  action === "release"
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("releaseLabel")}
              </button>
              <button
                onClick={() => setAction("refund")}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  action === "refund"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("refundLabel")}
              </button>
            </div>
          </div>

          <div>
            <label className="label block mb-1">{t("reasonLabel")} <span className="text-red-500">*</span></label>
            <textarea
              className="input w-full min-h-[80px] resize-none"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
            <Button
              variant={action === "release" ? "primary" : "danger"}
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {action === "release" ? t("confirmRelease") : t("confirmRefund")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
