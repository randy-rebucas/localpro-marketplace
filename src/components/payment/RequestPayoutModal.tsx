"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Wallet, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";
import {
  calculateWithdrawalFee,
  DEFAULT_WITHDRAWAL_FEE_BANK,
  DEFAULT_WITHDRAWAL_FEE_GCASH,
} from "@/lib/commission";

interface Props {
  availableBalance: number;
}

const BANKS = [
  "BDO Unibank",
  "BPI (Bank of the Philippine Islands)",
  "Metrobank",
  "PNB (Philippine National Bank)",
  "UnionBank",
  "Security Bank",
  "Landbank",
  "RCBC",
  "Chinabank",
  "EastWest Bank",
  "GCash",
  "Maya (PayMaya)",
  "Other",
];

export default function RequestPayoutModal({ availableBalance }: Props) {
  const router = useRouter();
  const t = useTranslations("requestPayoutModal");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: availableBalance > 0 ? availableBalance.toFixed(2) : "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }
    if (amount > availableBalance) {
      toast.error(t("exceedsBalance", { balance: formatCurrency(availableBalance) }));
      return;
    }
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountName.trim()) {
      toast.error(t("missingDetails"));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          accountName: form.accountName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("submitFailed"));
        return;
      }
      toast.success(t("submitSuccess"));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={availableBalance <= 0}
        className="flex items-center gap-2"
      >
        <Wallet className="h-4 w-4" />
        {t("triggerBtn")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t("modalTitle")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Available:{" "}
                  <span className="font-semibold text-green-600">
                    {formatCurrency(availableBalance)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t("amountLabel")}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    name="amount"
                    min="1"
                    step="0.01"
                    max={availableBalance}
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 pl-7 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Bank */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t("bankLabel")}
                </label>
                <select
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                >
                  <option value="">{t("bankPlaceholder")}</option>
                  {BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t("accountNumberLabel")}
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  placeholder={t("accountNumberPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t("accountNameLabel")}
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={form.accountName}
                  onChange={handleChange}
                  placeholder={t("accountNamePlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Withdrawal fee breakdown — shown once bank and a valid amount are entered */}
              {(() => {
                const parsedAmount = parseFloat(form.amount);
                if (!form.bankName || !(parsedAmount > 0)) return null;
                const { withdrawalFee, netAmount } = calculateWithdrawalFee(
                  parsedAmount,
                  form.bankName,
                  DEFAULT_WITHDRAWAL_FEE_BANK,
                  DEFAULT_WITHDRAWAL_FEE_GCASH
                );
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5 text-sm">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{t("payoutBreakdownHeading")}</p>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>{t("requestedAmountLabel")}</span>
                      <span className="font-medium">{formatCurrency(parsedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>
                        {t("withdrawalFeeLabel")}
                        <span className="ml-1 text-xs text-amber-600 font-medium">{t("nonRefundable")}</span>
                      </span>
                      <span className="text-red-500 font-medium">−{formatCurrency(withdrawalFee)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-amber-200 pt-1.5 font-semibold text-slate-900">
                      <span>{t("youWillReceiveLabel")}</span>
                      <span className="text-green-700">{formatCurrency(netAmount)}</span>
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-slate-400">
                {t("processingNote")}
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {tCommon("cancel")}
              </button>
              <Button isLoading={loading} onClick={submit} className="flex-1">
                {t("submitBtn")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
