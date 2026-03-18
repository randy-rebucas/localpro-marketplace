"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Coins } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface Props {
  jobId: string;
  budget: number;
}

export default function PartialReleaseButton({ jobId, budget }: Props) {
  const router = useRouter();
  const t = useTranslations("partialRelease");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= budget;

  async function handleSubmit() {
    if (!isValid) { toast.error(t("invalidAmount")); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/partial-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t("releaseFailed")); return; }
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
        className="btn btn-outline flex items-center gap-2 text-sm"
      >
        <Coins className="h-4 w-4" />
        {t("triggerBtn")}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("modalTitle")}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("description")}
          </p>

          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("totalBudgetLabel")}</span>
              <span className="font-semibold text-slate-900">₱{budget.toLocaleString()}</span>
            </div>
            {isValid && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("releaseAmountLabel")}</span>
                  <span className="font-semibold text-green-700">₱{parsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("commissionLabel")}</span>
                  <span className="text-slate-700">−₱{(Math.round(parsed * 0.2 * 100) / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500">{t("providerReceivesLabel")}</span>
                  <span className="font-bold text-slate-900">₱{(Math.round((parsed - Math.round(parsed * 0.2 * 100) / 100) * 100) / 100).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t("amountLabel")}
            </label>
            <input
              type="number"
              className="input w-full"
              placeholder={t("amountPlaceholder", { max: budget })}
              min={1}
              max={budget}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amount && !isValid && (
              <p className="text-xs text-red-600 mt-1">{t("amountRangeError", { max: budget.toLocaleString() })}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleSubmit} isLoading={isLoading} disabled={!isValid}>
              {isValid ? t("releaseBtn", { amount: parsed.toLocaleString() }) : t("releaseBtnEmpty")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
