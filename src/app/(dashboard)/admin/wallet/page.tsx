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
} from "lucide-react";
import type { IWalletWithdrawal, IUser, WalletWithdrawalStatus } from "@/types";
import WithdrawalActions from "./_components/WithdrawalActions";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Wallet Withdrawals" };

const statusConfig: Record<WalletWithdrawalStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    classes: "bg-amber-100 text-amber-700",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  processing: {
    label: "Processing",
    classes: "bg-blue-100 text-blue-700",
    icon: <Loader2 className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Completed",
    classes: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-100 text-red-700",
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

  const totalActive = active.reduce((s, w) => s + w.amount, 0);

  return (
    <div className="space-y-8">
      <PageGuide
        pageKey="admin-wallet-withdrawals"
        title="How Wallet Withdrawals work"
        steps={[
          { icon: "💰", title: "Client requests",   description: "Clients submit a withdrawal request from their wallet with their bank account details." },
          { icon: "🔍", title: "Verify details",    description: "Confirm the bank name, account number, and account name before processing." },
          { icon: "▶️", title: "Mark Processing",   description: "Set to Processing when you initiate the bank transfer so the request is tracked." },
          { icon: "✅", title: "Complete or Reject", description: "Mark Completed once funds are sent, or Reject (balance is automatically reversed to their wallet)." },
        ]}
      />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Wallet Withdrawals</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Review and process client requests to withdraw their wallet balance to a bank account.
        </p>
      </div>

      {/* Active requests */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-slate-900">Pending Requests</h3>
            <p className="text-xs text-slate-500">
              Clients awaiting withdrawal to their bank account.
              {totalActive > 0 && (
                <span className="ml-1.5 text-amber-600 font-medium">
                  · {formatCurrency(totalActive)} total
                </span>
              )}
            </p>
          </div>
          {active.length > 0 && (
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
              {active.length} awaiting action
            </span>
          )}
        </div>

        {active.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <Wallet className="h-9 w-9 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No pending withdrawal requests</p>
            <p className="text-slate-400 text-xs mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((w) => {
              const cfg = statusConfig[w.status];
              return (
                <div
                  key={String(w._id)}
                  className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {formatCurrency(w.amount)}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Requested by{" "}
                          <span className="font-medium text-slate-700">{w.userId.name}</span>{" "}
                          <span className="text-slate-400">({w.userId.email})</span>
                          <span className="text-slate-300 mx-2">·</span>
                          {formatDate(w.createdAt)}
                        </p>
                        {w.notes && (
                          <p className="text-xs text-slate-400 italic mt-1">{w.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Bank details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">Bank / Channel</p>
                        <p className="text-sm font-medium text-slate-800">{w.bankName}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">Account Name</p>
                        <p className="text-sm font-medium text-slate-800">{w.accountName}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">Account Number</p>
                        <p className="text-sm font-mono font-medium text-slate-800">{w.accountNumber}</p>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Withdrawal History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Client</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {done.map((w) => {
                    const cfg = statusConfig[w.status];
                    return (
                      <tr key={String(w._id)} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-slate-500">{formatDate(w.createdAt)}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-medium text-slate-800">{w.userId.name}</span>
                          <span className="block text-xs text-slate-400">{w.userId.email}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                          {formatCurrency(w.amount)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{w.bankName}</td>
                        <td className="px-6 py-3.5 text-slate-500">
                          <div className="text-xs">
                            <span className="block font-medium text-slate-700">{w.accountName}</span>
                            <span className="font-mono">{w.accountNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 text-xs max-w-[180px] truncate">
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
