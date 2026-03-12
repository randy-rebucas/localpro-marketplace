import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { walletService } from "@/services/wallet.service";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet, Clock, CheckCircle, XCircle,
  PlusCircle, BadgeCheck, AlertTriangle, BookOpen,
} from "lucide-react";
import WalletWithdrawForm from "./_components/WalletWithdrawForm";
import WalletTopUpForm from "./_components/WalletTopUpForm";
import WalletTopUpConfirm from "./_components/WalletTopUpConfirm";
import WalletLedgerTable from "./_components/WalletLedgerTable";
import WalletWithdrawalList from "./_components/WalletWithdrawalList";
import type { IWalletTransaction, IWalletWithdrawal } from "@/types";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "Wallet" };
}


export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { topup: topupStatus } = await searchParams;

  const { balance, pendingWithdrawals, availableBalance, transactions, withdrawals } =
    await walletService.getWallet(user.userId);

  const serialisedTx = JSON.parse(JSON.stringify(transactions)) as IWalletTransaction[];
  const unaccounted  = serialisedTx.filter((t) => !t.ledgerJournalId).length;

  const serialisedWithdrawals = JSON.parse(JSON.stringify(withdrawals)) as IWalletWithdrawal[];
  const unaccountedWithdrawals = serialisedWithdrawals.filter((w) => !w.ledgerJournalId).length;

  return (
    <div className="space-y-8">

      {/* ── Invisible client component: reads sessionStorage, calls verify, refreshes ── */}
      {topupStatus === "success" && <WalletTopUpConfirm />}

      {/* ── Page header ──────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <p className="text-slate-500 text-sm mt-1">
          Refunds from cancelled or disputed jobs land here. Top up, use your balance to fund escrow, or withdraw to your bank.
        </p>
      </div>

      {/* ── Contextual status banners ─────────────────────────────────────────────────── */}
      {topupStatus === "success" && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-800">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Top-up successful!</p>
            <p className="text-xs text-emerald-600">Your wallet is being credited. Your updated balance will appear momentarily.</p>
          </div>
        </div>
      )}
      {topupStatus === "cancelled" && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-amber-800">
          <XCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm">Top-up was cancelled. No charge was made.</p>
        </div>
      )}

      {/* ── 1. Balance overview ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100">
            <Wallet className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Balance</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Available</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(availableBalance)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending Withdrawals</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(pendingWithdrawals)}</p>
          </div>
        </div>
      </div>

      {/* ── 2 & 3. Two-column: ledger (left) + actions (right) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── LEFT: Transaction ledger ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">Transaction Ledger</h2>
              {serialisedTx.length > 0 && (
                <span className="text-xs text-slate-400 font-normal">({serialisedTx.length} entries)</span>
              )}
            </div>
            {serialisedTx.length > 0 && (
              unaccounted > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {unaccounted} missing ledger
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
                  <BadgeCheck className="h-3 w-3" />
                  All accounted
                </span>
              )
            )}
          </div>

          {serialisedTx.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No transactions yet. Top up or withdraw to get started.
            </div>
          ) : (
            <WalletLedgerTable transactions={serialisedTx} />
          )}
        </div>

        {/* ── RIGHT: Top up + Withdraw ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Top Up */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                <PlusCircle className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Top Up Wallet</h2>
                <p className="text-xs text-slate-500">Add funds via GCash, Maya, or card.</p>
              </div>
            </div>
            <WalletTopUpForm currentBalance={balance} />
          </div>

          {/* Withdraw + pending requests */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Withdraw to Bank</h2>
                <p className="text-sm text-slate-500 mt-1">Minimum ₱100. Processing takes 1–3 business days.</p>
              </div>
              <WalletWithdrawForm available={availableBalance} />
            </div>

            {serialisedWithdrawals.length > 0 && (
              <>
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Requests</p>
                  {unaccountedWithdrawals > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {unaccountedWithdrawals} missing ledger
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
                      <BadgeCheck className="h-3 w-3" />
                      All accounted
                    </span>
                  )}
                </div>
                <WalletWithdrawalList withdrawals={serialisedWithdrawals} />
              </>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
