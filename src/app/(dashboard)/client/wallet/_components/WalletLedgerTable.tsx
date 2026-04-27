"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle,
  BadgeCheck, AlertTriangle, ChevronDown, ChevronUp,
  Hash, CalendarDays, BookOpen, RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";
import WalletLedgerFooter from "./WalletLedgerFooter";
import type { IWalletTransaction } from "@/types";

// ─── TX type display config ──────────────────────────────────────────────────

const TX_CONFIG: Record<string, { label: string; credit: boolean; color: string; icon: React.ReactNode }> = {
  topup:                      { label: "Top-up",              credit: true,  color: "bg-violet-100 text-violet-700",  icon: <ArrowDownCircle className="h-4 w-4 text-violet-500" />  },
  refund_credit:              { label: "Refund",              credit: true,  color: "bg-emerald-100 text-emerald-700", icon: <ArrowDownCircle className="h-4 w-4 text-emerald-500" /> },
  withdrawal_reversed:        { label: "Withdrawal Reversed", credit: true,  color: "bg-blue-100 text-blue-700",      icon: <ArrowDownCircle className="h-4 w-4 text-blue-500" />    },
  admin_credit:               { label: "Admin Credit",        credit: true,  color: "bg-sky-100 text-sky-700",        icon: <ArrowDownCircle className="h-4 w-4 text-sky-500" />     },
  escrow_payment:             { label: "Escrow Funded",       credit: false, color: "bg-rose-100 text-rose-700",      icon: <ArrowUpCircle   className="h-4 w-4 text-rose-500" />    },
  withdrawal:                 { label: "Withdrawal",          credit: false, color: "bg-amber-100 text-amber-700",    icon: <ArrowUpCircle   className="h-4 w-4 text-amber-500" />   },
  admin_debit:                { label: "Admin Debit",         credit: false, color: "bg-slate-100 text-slate-600",    icon: <ArrowUpCircle   className="h-4 w-4 text-slate-500" />   },
  featured_listing_payment:   { label: "Featured Listing",    credit: false, color: "bg-orange-100 text-orange-700",  icon: <ArrowUpCircle   className="h-4 w-4 text-orange-500" />  },
  lead_fee_payment:           { label: "Lead Fee",            credit: false, color: "bg-rose-100 text-rose-700",      icon: <ArrowUpCircle   className="h-4 w-4 text-rose-500" />    },
  lead_subscription_payment:  { label: "Lead Subscription",  credit: false, color: "bg-rose-100 text-rose-700",      icon: <ArrowUpCircle   className="h-4 w-4 text-rose-500" />    },
  bid_credit_purchase:        { label: "Bid Credits",         credit: false, color: "bg-purple-100 text-purple-700",  icon: <ArrowUpCircle   className="h-4 w-4 text-purple-500" />  },
  training_course_payment:    { label: "Training Course",     credit: false, color: "bg-indigo-100 text-indigo-700",  icon: <ArrowUpCircle   className="h-4 w-4 text-indigo-500" />  },
};

// ─── Detail row ──────────────────────────────────────────────────────────────

function TxDetail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</span>
      <span className={`text-xs text-slate-700 break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WalletLedgerTable() {
  const [transactions, setTransactions] = useState<IWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/wallet/transactions");
      if (!res.ok) throw new Error("Failed to load transactions");
      const json = (await res.json()) as { transactions: IWalletTransaction[] };
      setTransactions(json.transactions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalIn  = transactions.filter((t) => TX_CONFIG[t.type]?.credit).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => !TX_CONFIG[t.type]?.credit).reduce((s, t) => s + t.amount, 0);
  const unaccounted = transactions.filter((t) => !t.ledgerJournalId).length;

  if (loading) {
    return (
      <div className="animate-pulse divide-y divide-slate-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-4">
            <div className="h-4 w-4 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <button onClick={load} className="text-xs text-violet-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-400">
        No transactions yet. Top up or withdraw to get started.
      </div>
    );
  }

  return (
    <>
      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-400 uppercase tracking-wide">
        <div className="flex items-center justify-between col-span-full sm:contents">
          <span>Description</span>
          <span className="hidden sm:block text-right">Amount</span>
          <span className="hidden sm:block text-right">Balance After</span>
          <span className="hidden sm:block text-right">Date</span>
          <div className="hidden sm:flex items-center gap-3 justify-end">
            {unaccounted > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 normal-case tracking-normal">
                <AlertTriangle className="h-3 w-3" />{unaccounted} missing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 normal-case tracking-normal">
                <BadgeCheck className="h-3 w-3" />All accounted
              </span>
            )}
            <button onClick={load} title="Refresh" className="text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {transactions.map((tx) => {
          const id = String(tx._id);
          const isOpen = expandedId === id;
          const cfg = TX_CONFIG[tx.type] ?? {
            label: tx.type,
            credit: true,
            color: "bg-slate-100 text-slate-600",
            icon: <Wallet className="h-4 w-4 text-slate-400" />,
          };
          const dateObj = new Date(tx.createdAt!);

          return (
            <div key={id}>
              {/* Main row */}
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : id)}
                className="w-full text-left grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 gap-y-1 px-6 py-3.5 items-center hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset"
                aria-expanded={isOpen}
              >
                {/* Description + type badge */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex-shrink-0">{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 truncate mt-0.5" title={tx.description}>
                      {tx.description}
                    </p>
                    {/* Mobile: date + balance */}
                    <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
                      {dateObj.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}Balance: <span className="font-medium text-slate-600">{formatCurrency(tx.balanceAfter)}</span>
                    </p>
                  </div>
                  {/* Chevron on mobile */}
                  <span className="sm:hidden ml-auto text-slate-400 flex-shrink-0">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </div>

                {/* Amount */}
                <div className="hidden sm:block text-right">
                  <span className={`text-sm font-semibold tabular-nums ${cfg.credit ? "text-emerald-600" : "text-rose-600"}`}>
                    {cfg.credit ? "+" : "−"}{formatCurrency(tx.amount)}
                  </span>
                </div>

                {/* Running balance */}
                <div className="hidden sm:block text-right">
                  <span className="text-sm text-slate-700 tabular-nums font-medium">
                    {formatCurrency(tx.balanceAfter)}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-slate-500">
                    {dateObj.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {dateObj.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Ledger status + chevron */}
                <div className="hidden sm:flex items-center gap-2 justify-end">
                  {tx.ledgerJournalId ? (
                    <span
                      title={`Journal: ${tx.ledgerJournalId}`}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
                    >
                      <BadgeCheck className="h-3 w-3" />
                      Accounted
                    </span>
                  ) : (
                    <span
                      title="No ledger journal entry found"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                  <span className="text-slate-400">
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                </div>
              </button>

              {/* Expanded detail panel */}
              {isOpen && (
                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <TxDetail
                      label="Amount"
                      value={`${cfg.credit ? "+" : "−"}${formatCurrency(tx.amount)}`}
                    />
                    <TxDetail
                      label="Balance After"
                      value={formatCurrency(tx.balanceAfter)}
                    />
                    <TxDetail
                      label="Date"
                      value={dateObj.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    />
                    <TxDetail
                      label="Time"
                      value={dateObj.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-start gap-2">
                      <Hash className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <TxDetail label="Transaction ID" value={String(tx._id)} mono />
                    </div>

                    {tx.refId && (
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <TxDetail label="Reference ID" value={String(tx.refId)} mono />
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      {tx.ledgerJournalId ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Ledger Journal</span>
                          <span className="text-xs font-mono text-emerald-700 break-all">{String(tx.ledgerJournalId)}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                            <BadgeCheck className="h-3 w-3" /> Accounted
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Ledger Journal</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                            <AlertTriangle className="h-3 w-3" /> No journal entry — pending reconciliation
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer totals — toggleable */}
      <WalletLedgerFooter totalIn={totalIn} totalOut={totalOut} />
    </>
  );
}
