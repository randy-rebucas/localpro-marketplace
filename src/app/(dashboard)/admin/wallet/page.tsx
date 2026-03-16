import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { walletRepository } from "@/repositories/wallet.repository";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  ArrowDownToLine,
  Ban,
} from "lucide-react";
import type { IWalletWithdrawal, IUser, WalletWithdrawalStatus } from "@/types";
import WithdrawalActions from "./_components/WithdrawalActions";
import TourGuide from "@/components/shared/TourGuide";

export const metadata: Metadata = { title: "Wallet Withdrawals" };

const statusConfig: Record<WalletWithdrawalStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  processing: {
    label: "Processing",
    classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Loader2 className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Completed",
    classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

type PopulatedWithdrawal = Omit<IWalletWithdrawal, "userId"> & {
  userId: Pick<IUser, "_id" | "name" | "email">;
};

export default async function AdminWalletPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) redirect("/dashboard");

  const raw = await walletRepository.listAllWithdrawals();
  const all = JSON.parse(JSON.stringify(raw)) as PopulatedWithdrawal[];

  const active = all.filter((w) => w.status === "pending" || w.status === "processing");
  const done   = all.filter((w) => w.status === "completed" || w.status === "rejected");

  const totalActive    = active.reduce((s, w) => s + w.amount, 0);
  const totalCompleted = done.filter((w) => w.status === "completed").reduce((s, w) => s + w.amount, 0);
  const completedCount = done.filter((w) => w.status === "completed").length;
  const rejectedCount  = done.filter((w) => w.status === "rejected").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Wallet Withdrawals</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review and process client requests to withdraw their wallet balance to a bank account.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide truncate">Pending</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{active.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(totalActive)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide truncate">Processing</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {active.filter((w) => w.status === "processing").length}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatCurrency(active.filter((w) => w.status === "processing").reduce((s, w) => s + w.amount, 0))}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide truncate">Completed</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{completedCount}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(totalCompleted)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
            <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide truncate">Rejected</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{rejectedCount}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">reversed to wallet</p>
          </div>
        </div>
      </div>

      <TourGuide
        pageKey="admin-wallet-withdrawals"
        title="How Wallet Withdrawals work"
        steps={[
          { icon: "💰", title: "Client requests",   description: "Clients submit a withdrawal request from their wallet with their bank account details." },
          { icon: "🔍", title: "Verify details",    description: "Confirm the bank name, account number, and account name before processing." },
          { icon: "▶️", title: "Mark Processing",   description: "Set to Processing when you initiate the bank transfer so the request is tracked." },
          { icon: "✅", title: "Complete or Reject", description: "Mark Completed once funds are sent, or Reject (balance is automatically reversed to their wallet)." },
        ]}
      />

      {/* Active requests */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Pending Requests</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clients awaiting withdrawal to their bank account.
              {totalActive > 0 && (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  · {formatCurrency(totalActive)} total
                </span>
              )}
            </p>
          </div>
          {active.length > 0 && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
              {active.length} awaiting action
            </span>
          )}
        </div>

        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
              <Wallet className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">No pending withdrawal requests</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((w) => {
              const cfg = statusConfig[w.status];
              return (
                <div
                  key={String(w._id)}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                            {formatCurrency(w.amount)}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.classes}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Requested by{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{w.userId.name}</span>{" "}
                          <span className="text-slate-400 dark:text-slate-500">({w.userId.email})</span>
                          <span className="text-slate-300 dark:text-slate-600 mx-2">·</span>
                          {formatDate(w.createdAt)}
                        </p>
                        {w.notes && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1">{w.notes}</p>
                        )}
                        {(w as { ledgerJournalId?: string | null }).ledgerJournalId && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                            Ledger: {(w as { ledgerJournalId?: string | null }).ledgerJournalId}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bank details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Bank / Channel</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{w.bankName}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Account Name</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{w.accountName}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Account Number</p>
                        <p className="text-sm font-mono font-semibold text-slate-800 dark:text-white">{w.accountNumber}</p>
                      </div>
                    </div>

                    <WithdrawalActions
                      withdrawalId={String(w._id)}
                      currentStatus={w.status as "pending" | "processing"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* History table */}
        {done.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white">Withdrawal History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Date</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Client</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Amount</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Bank</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Account</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ledger</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {done.map((w) => {
                    const cfg = statusConfig[w.status];
                    return (
                      <tr key={String(w._id)} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(w.createdAt)}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-800 dark:text-white">{w.userId.name}</span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500">{w.userId.email}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(w.amount)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{w.bankName}</td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                          <div className="text-xs">
                            <span className="block font-semibold text-slate-700 dark:text-slate-200">{w.accountName}</span>
                            <span className="font-mono">{w.accountNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.classes}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 max-w-[160px] truncate">
                          {(w as { ledgerJournalId?: string | null }).ledgerJournalId
                            ? <span className="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">{(w as { ledgerJournalId?: string | null }).ledgerJournalId}</span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 dark:text-slate-500 text-xs max-w-[180px] truncate">
                          {w.notes ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
