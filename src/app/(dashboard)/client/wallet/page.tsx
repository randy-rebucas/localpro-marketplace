import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { walletService } from "@/services/wallet.service";
import { formatCurrency } from "@/lib/utils";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import WalletWithdrawForm from "./_components/WalletWithdrawForm";
import type { IWalletTransaction, IWalletWithdrawal } from "@/types";

export const metadata: Metadata = { title: "Wallet" };

const TX_ICON: Record<string, React.ReactNode> = {
  refund_credit:       <ArrowDownCircle className="h-4 w-4 text-emerald-500" />,
  escrow_payment:      <ArrowUpCircle   className="h-4 w-4 text-rose-500"    />,
  withdrawal:          <ArrowUpCircle   className="h-4 w-4 text-amber-500"   />,
  withdrawal_reversed: <ArrowDownCircle className="h-4 w-4 text-violet-500"  />,
  admin_credit:        <ArrowDownCircle className="h-4 w-4 text-blue-500"    />,
  admin_debit:         <ArrowUpCircle   className="h-4 w-4 text-slate-500"   />,
};

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  completed:  "bg-emerald-100 text-emerald-700",
  rejected:   "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:    <Clock         className="h-3.5 w-3.5" />,
  processing: <AlertCircle   className="h-3.5 w-3.5" />,
  completed:  <CheckCircle   className="h-3.5 w-3.5" />,
  rejected:   <XCircle       className="h-3.5 w-3.5" />,
};

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { balance, pendingWithdrawals, availableBalance, transactions, withdrawals } =
    await walletService.getWallet(user.userId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <p className="text-slate-500 text-sm mt-1">
          Refunds from cancelled or disputed jobs land here. Use your balance to fund escrow or withdraw to your bank.
        </p>
      </div>

      {/* Balance cards */}
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
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending Withdrawals</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(pendingWithdrawals)}</p>
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
      </div>

      {/* Withdraw form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Withdraw to Bank</h2>
        <p className="text-sm text-slate-500">Minimum withdrawal is ₱100. Processing may take 1–3 business days.</p>
        <WalletWithdrawForm available={availableBalance} />
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(transactions as IWalletTransaction[]).map((tx) => (
              <div key={String(tx._id)} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0">
                    {TX_ICON[tx.type] ?? <Wallet className="h-4 w-4 text-slate-400" />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.createdAt!).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${["refund_credit","withdrawal_reversed","admin_credit"].includes(tx.type) ? "text-emerald-600" : "text-rose-600"}`}>
                    {["refund_credit","withdrawal_reversed","admin_credit"].includes(tx.type) ? "+" : "−"}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-slate-400">Balance: {formatCurrency(tx.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Withdrawal Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(withdrawals as IWalletWithdrawal[]).map((w) => (
              <div key={String(w._id)} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {w.bankName} — {w.accountNumber}
                  </p>
                  <p className="text-xs text-slate-400">{w.accountName}</p>
                  {w.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{w.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(w.amount)}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${STATUS_BADGE[w.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_ICON[w.status]}
                    {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
