"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Wallet, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

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
      toast.error("Please enter a valid amount.");
      return;
    }
    if (amount > availableBalance) {
      toast.error(`Amount exceeds your available balance of ${formatCurrency(availableBalance)}.`);
      return;
    }
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountName.trim()) {
      toast.error("Please fill in all bank account details.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payouts", {
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
        toast.error(data.error ?? "Failed to submit payout request.");
        return;
      }
      toast.success("Payout request submitted! Admin will process it shortly.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
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
        Request Payout
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Request Payout</h3>
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
                  Amount (PHP)
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
                  Bank / Payment Channel
                </label>
                <select
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                >
                  <option value="">Select bank...</option>
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
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={form.accountName}
                  onChange={handleChange}
                  placeholder="Full name as registered with your bank"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <p className="text-xs text-slate-400">
                Payouts are typically processed within 1–3 business days. An admin will
                review your request before releasing funds.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <Button isLoading={loading} onClick={submit} className="flex-1">
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
