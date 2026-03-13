"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Wallet, Shield, Loader2, ChevronRight } from "lucide-react";

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000, 10000];
const MIN = 100;
const MAX = 100_000;

interface Props {
  currentBalance: number;
}

export default function WalletTopUpForm({ currentBalance }: Props) {
  const inputId = useId();
  const router = useRouter();

  const [raw, setRaw]           = useState("");          // raw string in input
  const [selected, setSelected] = useState<number | null>(null); // quick-select
  const [step, setStep]         = useState<"form" | "confirm" | "redirecting">("form");
  const [error, setError]       = useState("");

  // Derive the numeric amount from whichever source is active
  const amount = selected ?? (raw === "" ? NaN : parseInt(raw, 10));
  const isValid = !isNaN(amount) && amount >= MIN && amount <= MAX;
  const balanceAfter = isValid ? currentBalance + amount : currentBalance;

  function handleQuickSelect(a: number) {
    setSelected(a);
    setRaw("");
    setError("");
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Only allow whole-peso integers
    const v = e.target.value.replace(/\D/g, "");
    setRaw(v);
    setSelected(null);
    setError("");
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      if (isNaN(amount) || amount <= 0) {
        setError("Please enter or select an amount.");
      } else if (amount < MIN) {
        setError(`Minimum top-up amount is ${formatCurrency(MIN)}.`);
      } else if (amount > MAX) {
        setError(`Maximum top-up amount is ${formatCurrency(MAX)} per transaction.`);
      }
      return;
    }
    setError("");
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!isValid) return;
    setStep("redirecting");
    try {
      const res = await apiFetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create checkout session. Please try again.");
        setStep("confirm");
        return;
      }
      // Persist session ID so WalletTopUpConfirm can verify it on the success page
      sessionStorage.setItem("wallet_topup_session", data.sessionId);
      // Hard redirect to PayMongo checkout page
      window.location.assign(data.checkoutUrl);
    } catch {
      toast.error("Network error. Please try again.");
      setStep("confirm");
    }
  }

  function handleBack() {
    setStep("form");
  }

  // ── Redirecting overlay ──────────────────────────────────────────────────
  if (step === "redirecting") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm font-medium">Redirecting to PayMongo checkout…</p>
        <p className="text-xs text-slate-400">Do not close this tab.</p>
      </div>
    );
  }

  // ── Confirmation step ────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-violet-200 bg-white divide-y divide-slate-100 overflow-hidden">
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-slate-500">Top-up amount</span>
            <span className="font-semibold text-slate-900">{formatCurrency(amount)}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-slate-500">Current balance</span>
            <span className="text-slate-700">{formatCurrency(currentBalance)}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm bg-violet-50">
            <span className="font-medium text-slate-700">Balance after top-up</span>
            <span className="font-bold text-violet-700">{formatCurrency(balanceAfter)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          <span>You will be redirected to PayMongo's secure checkout page. We do not store your card or payment details.</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 sm:flex-none rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 active:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Pay {formatCurrency(amount)}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
          Supports GCash, Maya, and credit/debit cards.
        </p>
      </div>
    );
  }

  // ── Main form step ───────────────────────────────────────────────────────
  return (
    <form onSubmit={handleContinue} noValidate className="space-y-5">
      {/* Quick select */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Quick select</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => handleQuickSelect(a)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 ${
                selected === a
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-violet-400 hover:text-violet-600"
              }`}
            >
              {formatCurrency(a)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Custom amount
        </label>
        <div className="relative">
          <span
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none"
          >
            ₱
          </span>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className={`input w-full pl-8 ${error ? "border-red-400 focus:ring-red-400" : ""}`}
            placeholder="e.g. 1500"
            value={raw}
            onChange={handleCustomChange}
            aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
            aria-invalid={!!error}
          />
        </div>
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 mt-1">
            {error}
          </p>
        ) : (
          <p id={`${inputId}-hint`} className="text-xs text-slate-400 mt-1">
            Minimum {formatCurrency(MIN)} · Maximum {formatCurrency(MAX)} per transaction
          </p>
        )}
      </div>

      {/* Preview pill when valid amount is entered */}
      {isValid && (
        <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-slate-500">Balance after top-up</span>
          <span className="font-bold text-violet-700">{formatCurrency(balanceAfter)}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 active:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
      >
        <CreditCard className="h-4 w-4" />
        {isValid ? `Continue with ${formatCurrency(amount)}` : "Select an amount"}
        {isValid && <ChevronRight className="h-4 w-4" />}
      </button>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
        Secured by PayMongo. Supports GCash, Maya, and credit/debit cards.
      </p>
    </form>
  );
}
