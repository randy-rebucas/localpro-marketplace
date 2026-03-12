"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/fetchClient";
import { ChevronDown, RefreshCw, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerLine {
  _id: string;
  debitAccount: string;
  creditAccount: string;
  amountCentavos: number;
  description: string;
  createdAt: string;
}

interface Journal {
  journalId: string;
  entryType: string;
  entityType: string;
  entityId: string;
  description: string;
  currency: string;
  createdAt: string;
  totalAmount: number;
  lineCount: number;
  lines: LedgerLine[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_NAMES: Record<string, string> = {
  "1000": "Gateway Receivable",
  "1100": "Escrow Held",
  "1200": "Wallet Funds Held",
  "2000": "Escrow Payable — Clients",
  "2100": "Earnings Payable — Providers",
  "2200": "Wallet Payable — Clients",
  "2300": "Withdrawal Payable — Clients",
  "3000": "Platform Equity",
  "4000": "Commission Revenue",
  "4100": "Subscription Revenue",
  "4200": "Late Fee Revenue",
  "5000": "Refunds Issued",
  "5100": "Payment Processing Fees",
  "5200": "Bad Debt / Write-offs",
};

const ENTRY_TYPE_LABELS: Record<string, string> = {
  escrow_funded_gateway:       "Escrow Funded (Gateway)",
  escrow_funded_wallet:        "Escrow Funded (Wallet)",
  commission_accrued:          "Commission Accrued",
  earnings_earmarked:          "Earnings Earmarked",
  escrow_released:             "Escrow Released",
  payout_sent:                 "Payout Sent",
  wallet_funded_gateway:       "Wallet Funded (Gateway)",
  wallet_debited_escrow:       "Wallet Debited for Escrow",
  wallet_withdrawal_requested: "Withdrawal Requested",
  wallet_withdrawal_completed: "Withdrawal Completed",
  wallet_withdrawal_reversed:  "Withdrawal Reversed",
  dispute_refund_commission:   "Dispute Refund (Commission)",
  dispute_refund_earnings:     "Dispute Refund (Earnings)",
  dispute_release:             "Dispute Release",
  partial_release:             "Partial Release",
  milestone_release:           "Milestone Release",
  admin_credit:                "Admin Credit",
  admin_debit:                 "Admin Debit",
  reversal:                    "Reversal",
};

const TYPE_COLORS: Record<string, string> = {
  escrow_funded_gateway:       "bg-blue-50 text-blue-700",
  escrow_funded_wallet:        "bg-blue-50 text-blue-700",
  commission_accrued:          "bg-green-50 text-green-700",
  earnings_earmarked:          "bg-green-50 text-green-700",
  escrow_released:             "bg-emerald-50 text-emerald-700",
  payout_sent:                 "bg-purple-50 text-purple-700",
  wallet_funded_gateway:       "bg-indigo-50 text-indigo-700",
  wallet_debited_escrow:       "bg-indigo-50 text-indigo-700",
  wallet_withdrawal_requested: "bg-amber-50 text-amber-700",
  wallet_withdrawal_completed: "bg-amber-50 text-amber-700",
  wallet_withdrawal_reversed:  "bg-red-50 text-red-700",
  dispute_refund_commission:   "bg-red-50 text-red-700",
  dispute_refund_earnings:     "bg-red-50 text-red-700",
  dispute_release:             "bg-orange-50 text-orange-700",
  admin_credit:                "bg-teal-50 text-teal-700",
  admin_debit:                 "bg-rose-50 text-rose-700",
  reversal:                    "bg-slate-100 text-slate-600",
};

const ENTITY_TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "job", label: "Job" },
  { value: "payment", label: "Payment" },
  { value: "payout", label: "Payout" },
  { value: "dispute", label: "Dispute" },
  { value: "wallet_withdrawal", label: "Withdrawal" },
  { value: "transaction", label: "Transaction" },
  { value: "manual", label: "Manual" },
];

function fmt(centavos: number) {
  return formatCurrency(centavos / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Journal row ──────────────────────────────────────────────────────────────

function JournalRow({ journal }: { journal: Journal }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLORS[journal.entryType] ?? "bg-slate-100 text-slate-600";
  const label = ENTRY_TYPE_LABELS[journal.entryType] ?? journal.entryType;
  const amount = journal.lines.reduce((s, l) => s + l.amountCentavos, 0);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />

        {/* Entry type badge */}
        <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
          {label}
        </span>

        {/* Description */}
        <span className="flex-1 text-sm text-slate-700 truncate min-w-0">{journal.description}</span>

        {/* Entity badge */}
        <span className="hidden sm:inline-block flex-shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
          {journal.entityType}
        </span>

        {/* Amount */}
        <span className="flex-shrink-0 text-sm font-semibold text-slate-800 tabular-nums">
          {fmt(amount)}
        </span>

        {/* Date */}
        <span className="flex-shrink-0 text-xs text-slate-400 hidden md:block">
          {fmtDate(journal.createdAt)}
        </span>

        {/* Line count pill */}
        <span className="flex-shrink-0 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
          {journal.lineCount}×
        </span>
      </button>

      {/* Collapsable detail */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
          {/* Journal meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
            <span>Journal ID: <code className="font-mono text-slate-700">{journal.journalId}</code></span>
            <span>Entity: <code className="font-mono text-slate-700">{String(journal.entityId)}</code></span>
            <span>{fmtDate(journal.createdAt)}</span>
          </div>

          {/* Double-entry lines table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wide">Debit</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wide">Credit</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journal.lines.map((line) => (
                  <tr key={line._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2">
                      <span className="font-mono text-slate-400 mr-1">{line.debitAccount}</span>
                      <span className="text-slate-700">{ACCOUNT_NAMES[line.debitAccount] ?? line.debitAccount}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-slate-400 mr-1">{line.creditAccount}</span>
                      <span className="text-slate-700">{ACCOUNT_NAMES[line.creditAccount] ?? line.creditAccount}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">
                      {fmt(line.amountCentavos)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[200px] hidden sm:table-cell">
                      {line.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function LedgerEntriesClient({ embedded = false }: { embedded?: boolean }) {
  const [journals, setJournals]   = useState<Journal[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [entity, setEntity]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const LIMIT = 15;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (entity) params.set("entity", entity);
      const res = await apiFetch(`/api/admin/accounting/entries?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setJournals(data.journals ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, entity]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Reset to page 1 when filter changes
  const handleEntityChange = (v: string) => { setEntity(v); setPage(1); };

  return (
    <div className={embedded ? "overflow-hidden" : "bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden"}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-800">Ledger Journal Entries</h3>
          {!loading && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {total.toLocaleString()} journals
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Entity type filter */}
          <div className="flex gap-1 flex-wrap">
            {ENTITY_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleEntityChange(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  entity === f.value
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchEntries}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 py-6 text-center">Failed to load entries. Please try again.</p>
        ) : journals.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            No ledger entries yet. Balances will appear once transactions are processed.
          </p>
        ) : (
          <div className="space-y-2">
            {journals.map((j) => (
              <JournalRow key={j.journalId} journal={j} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
