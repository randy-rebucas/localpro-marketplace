import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { payoutService } from "@/services/payout.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
} from "lucide-react";
import type { IPayout, IUser, PayoutStatus } from "@/types";
import PayoutActions from "./PayoutActions";

export const metadata: Metadata = { title: "Manage Payouts" };


const statusConfig: Record<PayoutStatus, { label: string; classes: string; icon: React.ReactNode }> = {
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

type PopulatedPayout = Omit<IPayout, "providerId"> & {
  providerId: Pick<IUser, "_id" | "name" | "email">;
};

export default async function AdminPayoutsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allPayouts = (await payoutService.listAllPayouts()) as unknown as PopulatedPayout[];

  const pending = allPayouts.filter((p) => p.status === "pending");
  const processing = allPayouts.filter((p) => p.status === "processing");
  const done = allPayouts.filter((p) => p.status === "completed" || p.status === "rejected");

  const totalPendingAmount = [...pending, ...processing].reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Payout Requests</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {pending.length + processing.length} payout{pending.length + processing.length !== 1 ? "s" : ""} awaiting action
          {totalPendingAmount > 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              · {formatCurrency(totalPendingAmount)} total
            </span>
          )}
        </p>
      </div>

      {/* Active requests */}
      {pending.length === 0 && processing.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No pending payout requests</p>
          <p className="text-slate-400 text-xs mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...pending, ...processing].map((payout) => {
            const cfg = statusConfig[payout.status];
            return (
              <div
                key={payout._id.toString()}
                className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {formatCurrency(payout.amount)}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Requested by{" "}
                        <span className="font-medium text-slate-700">
                          {payout.providerId.name}
                        </span>{" "}
                        <span className="text-slate-400">({payout.providerId.email})</span>
                        <span className="text-slate-300 mx-2">·</span>
                        {formatDate(payout.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Bank details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Bank / Channel</p>
                      <p className="text-sm font-medium text-slate-800">{payout.bankName}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Account Name</p>
                      <p className="text-sm font-medium text-slate-800">{payout.accountName}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Account Number</p>
                      <p className="text-sm font-mono font-medium text-slate-800">
                        {payout.accountNumber}
                      </p>
                    </div>
                  </div>

                  <PayoutActions
                    payoutId={payout._id.toString()}
                    currentStatus={payout.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed/Rejected history */}
      {done.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Provider</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {done.map((p) => {
                  const cfg = statusConfig[p.status];
                  return (
                    <tr key={p._id.toString()} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500">{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-3.5">
                        <span className="font-medium text-slate-800">{p.providerId.name}</span>
                        <span className="block text-xs text-slate-400">{p.providerId.email}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{p.bankName}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        <div className="text-xs">
                          <span className="block font-medium text-slate-700">{p.accountName}</span>
                          <span className="font-mono">{p.accountNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs max-w-[180px] truncate">
                        {p.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
