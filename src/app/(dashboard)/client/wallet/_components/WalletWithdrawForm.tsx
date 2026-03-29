"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";

interface Props {
  available: number;
}

function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num;
  return "•".repeat(num.length - 4) + num.slice(-4);
}

export default function WalletWithdrawForm({ available }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accountFocused, setAccountFocused] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    amount: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }
    if (amount > available) {
      toast.error(`Amount exceeds available balance (${formatCurrency(available)})`);
      return;
    }
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountName.trim()) {
      toast.error("Please fill in all bank details");
      return;
    }
    if (!/^\d{8,20}$/.test(form.accountNumber)) {
      toast.error("Account number must be 8–20 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Withdrawal request failed"); return; }
      toast.success("Withdrawal request submitted");
      setForm({ bankName: "", accountNumber: "", accountName: "", amount: "" });
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label block mb-1">Bank Name</label>
          <input
            className="input w-full"
            placeholder="e.g. BDO, BPI, GCash"
            value={form.bankName}
            onChange={(e) => update("bankName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label block mb-1">Account Number</label>
          <input
            className="input w-full"
            placeholder="8–20 digit account number"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={8}
            maxLength={20}
            value={accountFocused ? form.accountNumber : maskAccountNumber(form.accountNumber)}
            onFocus={() => setAccountFocused(true)}
            onBlur={() => setAccountFocused(false)}
            onChange={(e) => update("accountNumber", e.target.value.replace(/\D/g, ""))}
            required
          />
          {!accountFocused && form.accountNumber.length > 4 && (
            <p className="text-[11px] text-slate-400 mt-0.5">Last 4 digits shown for security</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="label block mb-1">Account Name</label>
          <input
            className="input w-full"
            placeholder="Account holder's full name"
            value={form.accountName}
            onChange={(e) => update("accountName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label block mb-1">
            Amount (available: {formatCurrency(available)})
          </label>
          <input
            className="input w-full"
            type="number"
            min="1"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" isLoading={loading} disabled={available <= 0}>
        Request Withdrawal
      </Button>
    </form>
  );
}
