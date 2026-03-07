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

export default function WalletWithdrawForm({ available }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
            placeholder="Your bank account number"
            value={form.accountNumber}
            onChange={(e) => update("accountNumber", e.target.value)}
            required
          />
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
