"use client";

import { useState } from "react";
import { Plus, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Account catalogue (mirrors LedgerEntry model) ──────────────────────────

export const ACCOUNTS: { code: string; name: string; type: string; normalBalance: "DR" | "CR" }[] = [
  { code: "1000", name: "Gateway Receivable",       type: "Asset",     normalBalance: "DR" },
  { code: "1100", name: "Escrow Held",              type: "Asset",     normalBalance: "DR" },
  { code: "1200", name: "Wallet Funds Held",        type: "Asset",     normalBalance: "DR" },
  { code: "2000", name: "Escrow Payable — Clients", type: "Liability", normalBalance: "CR" },
  { code: "2100", name: "Earnings Payable",         type: "Liability", normalBalance: "CR" },
  { code: "2200", name: "Wallet Payable — Clients", type: "Liability", normalBalance: "CR" },
  { code: "2300", name: "Withdrawal Payable",       type: "Liability", normalBalance: "CR" },
  { code: "3000", name: "Platform Equity",          type: "Equity",    normalBalance: "CR" },
  { code: "4000", name: "Commission Revenue",       type: "Revenue",   normalBalance: "CR" },
  { code: "4100", name: "Subscription Revenue",     type: "Revenue",   normalBalance: "CR" },
  { code: "4200", name: "Late Fee Revenue",         type: "Revenue",   normalBalance: "CR" },
  { code: "5000", name: "Refunds Issued",           type: "Expense",   normalBalance: "DR" },
  { code: "5100", name: "Payment Processing Fees",  type: "Expense",   normalBalance: "DR" },
  { code: "5200", name: "Bad Debt / Write-offs",    type: "Expense",   normalBalance: "DR" },
];

const ACCOUNT_MAP = Object.fromEntries(ACCOUNTS.map((a) => [a.code, a]));

const TYPE_COLORS: Record<string, string> = {
  Asset:     "text-blue-600",
  Liability: "text-orange-600",
  Equity:    "text-purple-600",
  Revenue:   "text-green-600",
  Expense:   "text-red-600",
};

// ─── AccountSelect ──────────────────────────────────────────────────────────

function AccountSelect({
  id,
  label,
  value,
  onChange,
  exclude,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
}) {
  const acc = ACCOUNT_MAP[value];
  return (
    <div className="flex-1 min-w-0">
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          {ACCOUNTS.filter((a) => a.code !== exclude).map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} — {a.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
          </svg>
        </div>
      </div>
      {acc && (
        <p className={`mt-1 text-xs font-medium ${TYPE_COLORS[acc.type] ?? "text-slate-500"}`}>
          {acc.type} · Normal balance: <strong>{acc.normalBalance}</strong>
        </p>
      )}
    </div>
  );
}

// ─── Main form ──────────────────────────────────────────────────────────────

interface FormState {
  debitAccount:  string;
  creditAccount: string;
  amountPHP:     string;
  description:   string;
  reason:        string;
  entityId:      string;
  clientId:      string;
  providerId:    string;
}

const INITIAL: FormState = {
  debitAccount:  "1000",
  creditAccount: "2200",
  amountPHP:     "",
  description:   "",
  reason:        "",
  entityId:      "",
  clientId:      "",
  providerId:    "",
};

export default function ManualEntryForm() {
  const [form, setForm]           = useState<FormState>(INITIAL);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<{ ok: boolean; message: string; journalId?: string } | null>(null);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  const amountNum = parseFloat(form.amountPHP);
  const isValidAmount = !isNaN(amountNum) && amountNum > 0;

  const debitAcc  = ACCOUNT_MAP[form.debitAccount];
  const creditAcc = ACCOUNT_MAP[form.creditAccount];

  // Helper: warn if entry goes against normal balance for account
  function normalBalanceWarning(code: string, side: "DR" | "CR"): string | null {
    const acc = ACCOUNT_MAP[code];
    if (!acc) return null;
    if (acc.normalBalance !== side) {
      return `${acc.name} normally has a ${acc.normalBalance} balance — debiting a CR-normal account or crediting a DR-normal account is unusual`;
    }
    return null;
  }

  const drWarning = normalBalanceWarning(form.debitAccount, "DR");
  const crWarning = normalBalanceWarning(form.creditAccount, "CR");

  const canPreview =
    form.debitAccount !== form.creditAccount &&
    isValidAmount &&
    form.description.trim().length >= 5 &&
    form.reason.trim().length >= 5;

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/accounting/manual-entry", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debitAccount:  form.debitAccount,
          creditAccount: form.creditAccount,
          amountPHP:     amountNum,
          description:   form.description.trim(),
          reason:        form.reason.trim(),
          entityId:      form.entityId.trim() || undefined,
          clientId:      form.clientId.trim()   || undefined,
          providerId:    form.providerId.trim()  || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data?.error ?? "Submission failed" });
      } else {
        setResult({ ok: true, message: "Journal entry posted successfully.", journalId: data.journalId });
        setForm(INITIAL);
        setConfirming(false);
      }
    } catch {
      setResult({ ok: false, message: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-5 space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold text-slate-800">Post Manual Journal Entry</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Use for corrections, write-offs, goodwill credits, or any event without an automated flow.
          Every entry is immutable and logged to the audit trail.
        </p>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm ${
          result.ok
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
            : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
          }
          <div>
            <p className="font-medium">{result.message}</p>
            {result.journalId && (
              <p className="text-xs mt-0.5 text-green-700 font-mono">{result.journalId}</p>
            )}
          </div>
        </div>
      )}

      {/* Account pair */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Accounts</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <AccountSelect
            id="debit-account"
            label="Debit (DR)"
            value={form.debitAccount}
            onChange={set("debitAccount")}
            exclude={form.creditAccount}
          />
          <ArrowRight className="hidden sm:block w-5 h-5 text-slate-300 mb-3 shrink-0" />
          <AccountSelect
            id="credit-account"
            label="Credit (CR)"
            value={form.creditAccount}
            onChange={set("creditAccount")}
            exclude={form.debitAccount}
          />
        </div>

        {/* Normal balance warnings */}
        {(drWarning || crWarning) && (
          <div className="mt-2 space-y-1">
            {drWarning && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                DR side: {drWarning}
              </p>
            )}
            {crWarning && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                CR side: {crWarning}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount-php" className="block text-xs font-medium text-slate-500 mb-1">
          Amount (PHP)
        </label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₱</span>
          <input
            id="amount-php"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amountPHP}
            onChange={(e) => set("amountPHP")(e.target.value)}
            className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        {isValidAmount && (
          <p className="mt-1 text-xs text-slate-500">
            = {amountNum * 100 | 0} centavos
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-xs font-medium text-slate-500 mb-1">
          Description <span className="text-slate-400">(shown in journal)</span>
        </label>
        <input
          id="description"
          type="text"
          maxLength={300}
          placeholder="e.g. Goodwill credit for Job #abc123 — provider compensation"
          value={form.description}
          onChange={(e) => set("description")(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Reason */}
      <div>
        <label htmlFor="reason" className="block text-xs font-medium text-slate-500 mb-1">
          Audit reason <span className="text-slate-400">(stored in metadata, not shown publicly)</span>
        </label>
        <textarea
          id="reason"
          rows={2}
          maxLength={500}
          placeholder="Explain why this manual entry is needed (required for audit trail)"
          value={form.reason}
          onChange={(e) => set("reason")(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      </div>

      {/* Optional fields */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 select-none list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Optional — link entry to an entity or user
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="entity-id" className="block text-xs font-medium text-slate-500 mb-1">Entity ID</label>
            <input
              id="entity-id"
              type="text"
              placeholder="MongoDB ObjectId"
              value={form.entityId}
              onChange={(e) => set("entityId")(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="client-id" className="block text-xs font-medium text-slate-500 mb-1">Client User ID</label>
            <input
              id="client-id"
              type="text"
              placeholder="Optional"
              value={form.clientId}
              onChange={(e) => set("clientId")(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="provider-id" className="block text-xs font-medium text-slate-500 mb-1">Provider User ID</label>
            <input
              id="provider-id"
              type="text"
              placeholder="Optional"
              value={form.providerId}
              onChange={(e) => set("providerId")(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </details>

      {/* Preview + Confirm */}
      {canPreview && !confirming && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Journal Preview</span>
            <span className="text-xs text-slate-400">Review before posting</span>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {/* DR line */}
            <div className="flex items-center gap-3">
              <span className="w-7 text-xs font-bold text-blue-600 shrink-0">DR</span>
              <span className="font-mono text-xs text-slate-400 w-10 shrink-0">{debitAcc?.code}</span>
              <span className="flex-1 text-slate-700">{debitAcc?.name}</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(amountNum)}</span>
            </div>
            {/* CR line */}
            <div className="flex items-center gap-3 pl-4">
              <span className="w-7 text-xs font-bold text-orange-600 shrink-0">CR</span>
              <span className="font-mono text-xs text-slate-400 w-10 shrink-0">{creditAcc?.code}</span>
              <span className="flex-1 text-slate-700">{creditAcc?.name}</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(amountNum)}</span>
            </div>
            <p className="text-xs text-slate-400 pt-0.5 border-t border-slate-100 mt-2">
              &ldquo;{form.description.trim()}&rdquo;
            </p>
          </div>
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-end">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post Entry
            </button>
          </div>
        </div>
      )}

      {/* Confirmation step */}
      {confirming && (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Confirm manual journal entry</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This entry is <strong>immutable</strong> — it cannot be deleted, only reversed with a separate entry.
                Post <strong>{formatCurrency(amountNum)}</strong>{" "}
                DR&nbsp;<strong>{debitAcc?.code} {debitAcc?.name}</strong>{" "}
                / CR&nbsp;<strong>{creditAcc?.code} {creditAcc?.name}</strong>?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Posting…" : "Yes, post entry"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirming(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!canPreview && (
        <p className="text-xs text-slate-400">
          Fill in all required fields (accounts, amount ≥ 0.01, description and reason ≥ 5 chars) to preview the entry.
        </p>
      )}
    </div>
  );
}
