"use client";

import { useState } from "react";
import {
  Clock, AlertCircle, CheckCircle, XCircle,
  BadgeCheck, AlertTriangle, ChevronDown, ChevronUp,
  Hash, CalendarDays, Building2, CreditCard, User,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { IWalletWithdrawal } from "@/types";

// ─── Status display config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
  journalLabel: string;
  debit: string;
  credit: string;
}> = {
  pending: {
    label:        "Pending",
    badgeClass:   "bg-amber-100 text-amber-700",
    icon:         <Clock className="h-3.5 w-3.5" />,
    journalLabel: "Withdrawal Reserved",
    debit:        "2200 Wallet Payable",
    credit:       "2300 Withdrawal Payable",
  },
  processing: {
    label:        "Processing",
    badgeClass:   "bg-blue-100 text-blue-700",
    icon:         <AlertCircle className="h-3.5 w-3.5" />,
    journalLabel: "Withdrawal Reserved",
    debit:        "2200 Wallet Payable",
    credit:       "2300 Withdrawal Payable",
  },
  completed: {
    label:        "Completed",
    badgeClass:   "bg-emerald-100 text-emerald-700",
    icon:         <CheckCircle className="h-3.5 w-3.5" />,
    journalLabel: "Withdrawal Disbursed",
    debit:        "2300 Withdrawal Payable",
    credit:       "1000 Gateway Receivable",
  },
  rejected: {
    label:        "Rejected",
    badgeClass:   "bg-red-100 text-red-700",
    icon:         <XCircle className="h-3.5 w-3.5" />,
    journalLabel: "Withdrawal Reversed",
    debit:        "2300 Withdrawal Payable",
    credit:       "2200 Wallet Payable",
  },
};

// ─── Detail field ─────────────────────────────────────────────────────────────

function Detail({ label, value, mono, icon }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 flex-shrink-0 text-slate-400">{icon}</span>}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</span>
        <span className={`text-xs text-slate-700 break-all ${mono ? "font-mono" : ""}`}>{value}</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  withdrawals: IWalletWithdrawal[];
}

export default function WalletWithdrawalList({ withdrawals }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-slate-100">
      {withdrawals.map((w) => {
        const id     = String(w._id);
        const isOpen = expandedId === id;
        const cfg    = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
        const createdAt  = new Date(w.createdAt);
        const processedAt = w.processedAt ? new Date(w.processedAt) : null;

        return (
          <div key={id}>
            {/* Main row */}
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : id)}
              className="w-full text-left flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset"
              aria-expanded={isOpen}
            >
              {/* Left: bank info */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {w.bankName} — {w.accountNumber}
                </p>
                <p className="text-xs text-slate-400 truncate">{w.accountName}</p>
                {w.notes && (
                  <p className="text-xs text-slate-500 mt-0.5 italic truncate">{w.notes}</p>
                )}
              </div>

              {/* Right: amount + status + ledger + chevron */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <p className="text-sm font-semibold text-slate-800">{formatCurrency(w.amount)}</p>

                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}>
                  {cfg.icon}
                  {cfg.label}
                </span>

                {w.ledgerJournalId ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <BadgeCheck className="h-3 w-3" />
                    Accounted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    Pending ledger
                  </span>
                )}
              </div>

              <span className="text-slate-400 flex-shrink-0 ml-2">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {/* Expanded detail panel */}
            {isOpen && (
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 space-y-4">

                {/* Bank details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Detail
                    label="Bank"
                    value={w.bankName}
                    icon={<Building2 className="h-3.5 w-3.5" />}
                  />
                  <Detail
                    label="Account Number"
                    value={w.accountNumber}
                    mono
                    icon={<CreditCard className="h-3.5 w-3.5" />}
                  />
                  <Detail
                    label="Account Name"
                    value={w.accountName}
                    icon={<User className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* Dates + ID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <Detail
                    label="Requested"
                    value={createdAt.toLocaleString("en-PH", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                  />
                  {processedAt && (
                    <Detail
                      label={w.status === "completed" ? "Completed" : "Processed"}
                      value={processedAt.toLocaleString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      icon={<CalendarDays className="h-3.5 w-3.5" />}
                    />
                  )}
                  <Detail
                    label="Withdrawal ID"
                    value={id}
                    mono
                    icon={<Hash className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* Ledger / accounting */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">Accounting Journal Entry</p>
                    {w.ledgerJournalId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <BadgeCheck className="h-3 w-3" /> Recorded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3" /> Not yet written
                      </span>
                    )}
                  </div>

                  {/* Journal entry table */}
                  <div className="text-xs font-mono">
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1">
                      <span className="text-slate-400 uppercase text-[10px]">DR</span>
                      <span className="text-rose-600">{cfg.debit}</span>
                      <span className="text-slate-700 tabular-nums">{formatCurrency(w.amount)}</span>

                      <span className="text-slate-400 uppercase text-[10px]">CR</span>
                      <span className="text-emerald-600">{cfg.credit}</span>
                      <span className="text-slate-700 tabular-nums">{formatCurrency(w.amount)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">{cfg.journalLabel}</p>

                  {w.ledgerJournalId && (
                    <p className="text-[10px] text-slate-400 font-mono break-all">
                      Journal ref: {w.ledgerJournalId}
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
