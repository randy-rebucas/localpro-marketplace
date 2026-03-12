"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet, RefreshCw, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle,
  BadgeCheck, ChevronDown, ChevronUp, Hash, CalendarDays, BookOpen,
} from "lucide-react";
import type { IWalletTransaction, IWalletWithdrawal } from "@/types";

// ─── TX type config (mirrors WalletLedgerTable) ─────────────────────────────

const TX_CONFIG: Record<string, { label: string; credit: boolean; color: string; icon: React.ReactNode }> = {
  topup:               { label: "Top-up",             credit: true,  color: "bg-violet-100 text-violet-700",  icon: <ArrowDownCircle className="h-4 w-4 text-violet-500" />  },
  refund_credit:       { label: "Refund",              credit: true,  color: "bg-emerald-100 text-emerald-700", icon: <ArrowDownCircle className="h-4 w-4 text-emerald-500" /> },
  withdrawal_reversed: { label: "Withdrawal Reversed", credit: true,  color: "bg-blue-100 text-blue-700",      icon: <ArrowDownCircle className="h-4 w-4 text-blue-500" />    },
  admin_credit:        { label: "Admin Credit",        credit: true,  color: "bg-sky-100 text-sky-700",        icon: <ArrowDownCircle className="h-4 w-4 text-sky-500" />     },
  escrow_payment:      { label: "Escrow Funded",       credit: false, color: "bg-rose-100 text-rose-700",      icon: <ArrowUpCircle   className="h-4 w-4 text-rose-500" />    },
  withdrawal:          { label: "Withdrawal",          credit: false, color: "bg-amber-100 text-amber-700",    icon: <ArrowUpCircle   className="h-4 w-4 text-amber-500" />   },
  admin_debit:         { label: "Admin Debit",         credit: false, color: "bg-slate-100 text-slate-600",    icon: <ArrowUpCircle   className="h-4 w-4 text-slate-500" />   },
};

const WITHDRAWAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending",    color: "bg-amber-100 text-amber-700"   },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700"     },
  completed:  { label: "Completed",  color: "bg-emerald-100 text-emerald-700" },
  rejected:   { label: "Rejected",   color: "bg-red-100 text-red-700"       },
};

function TxDetail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</span>
      <span className={`text-xs text-slate-700 break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

interface WalletData {
  balance: number;
  pendingWithdrawals: number;
  availableBalance: number;
  transactions: IWalletTransaction[];
  withdrawals: IWalletWithdrawal[];
}

interface Props {
  userId: string;
}

export default function UserWalletSection({ userId }: Props) {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/wallet-transactions`);
      if (!res.ok) throw new Error("Failed to load wallet data");
      const json = (await res.json()) as WalletData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Wallet</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { balance, pendingWithdrawals, availableBalance, transactions, withdrawals } = data;

  return (
    <div className="space-y-5">
      {/* ── Balance strip ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-700">Wallet Balances</h3>
          </div>
          <button
            onClick={load}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <div className="px-5 py-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">Total Balance</p>
            <p className="text-base font-bold text-slate-900 tabular-nums">{formatCurrency(balance)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">Reserved</p>
            <p className="text-base font-bold text-amber-700 tabular-nums">{formatCurrency(pendingWithdrawals)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">Available</p>
            <p className="text-base font-bold text-emerald-700 tabular-nums">{formatCurrency(availableBalance)}</p>
          </div>
        </div>
      </div>

      {/* ── Transactions ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">
              Wallet Transactions
              <span className="ml-2 text-[11px] font-normal text-slate-400">
                ({transactions.length} total)
              </span>
            </h3>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400 italic">
            No wallet transactions yet.
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50/50">
              <span>Description</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Balance After</span>
              <span className="text-right">Date</span>
              <span className="text-right">Ledger</span>
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
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : id)}
                      className="w-full text-left grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 gap-y-1 px-5 py-3 items-center hover:bg-slate-50 transition-colors focus:outline-none"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex-shrink-0">{cfg.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <p className="text-sm text-slate-700 truncate mt-0.5" title={tx.description}>
                            {tx.description}
                          </p>
                        </div>
                        <span className="sm:hidden ml-auto text-slate-400">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className={`text-sm font-semibold tabular-nums ${cfg.credit ? "text-emerald-600" : "text-rose-600"}`}>
                          {cfg.credit ? "+" : "−"}{formatCurrency(tx.amount)}
                        </span>
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className="text-sm text-slate-700 tabular-nums">{formatCurrency(tx.balanceAfter)}</span>
                      </div>

                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-slate-500">
                          {dateObj.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {dateObj.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5 justify-end">
                        {tx.ledgerJournalId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <BadgeCheck className="h-3 w-3" /> Accounted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="h-3 w-3" /> Pending
                          </span>
                        )}
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-slate-50 border-t border-slate-100 px-5 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <TxDetail label="Amount" value={`${cfg.credit ? "+" : "−"}${formatCurrency(tx.amount)}`} />
                          <TxDetail label="Balance After" value={formatCurrency(tx.balanceAfter)} />
                          <TxDetail label="Date" value={dateObj.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} />
                          <TxDetail label="Time" value={dateObj.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} />
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
          </>
        )}
      </div>

      {/* ── Withdrawals ────────────────────────────────────────────────────── */}
      {withdrawals.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">
              Withdrawal History
              <span className="ml-2 text-[11px] font-normal text-slate-400">({withdrawals.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {withdrawals.map((w) => {
              const statusCfg = WITHDRAWAL_STATUS_CONFIG[w.status] ?? { label: w.status, color: "bg-slate-100 text-slate-600" };
              const dateObj = new Date((w as unknown as { createdAt: string }).createdAt);
              return (
                <div key={String(w._id)} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(w.amount)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {w.bankName} •••• {String(w.accountNumber).slice(-4)}
                    </p>
                    {w.ledgerJournalId && (
                      <p className="text-[10px] font-mono text-emerald-600 mt-0.5">{String(w.ledgerJournalId)}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 text-right shrink-0">
                    {dateObj.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
