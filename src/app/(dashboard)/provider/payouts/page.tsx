import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { payoutService } from "@/services/payout.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Clock, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import type { IPayout, PayoutStatus } from "@/types";
import Link from "next/link";
import RequestPayoutModal from "@/components/payment/RequestPayoutModal";

export const metadata: Metadata = { title: "Payouts" };


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

export default async function ProviderPayoutsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { payouts, availableBalance } = await payoutService.listProviderPayouts(user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payouts</h2>
          <p className="text-slate-500 text-sm mt-0.5">History of your withdrawal requests.</p>
        </div>
      </div>

      {/* Available balance banner */}
      {availableBalance > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                You have{" "}
                <span className="text-primary font-bold">{formatCurrency(availableBalance)}</span>{" "}
                available to withdraw.
              </p>
              <p className="text-xs text-slate-500">Payouts are processed within 1–3 business days.</p>
            </div>
          </div>
          <RequestPayoutModal availableBalance={availableBalance} />
        </div>
      )}

      {/* Payouts table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Payout Requests</h3>
        </div>
        {payouts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No payout requests yet</p>
            <p className="text-slate-400 text-xs mt-1">
              Once you have completed transactions, you can request a payout.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payouts as unknown as IPayout[]).map((p) => {
                  const cfg = statusConfig[p.status];
                  return (
                    <tr key={p._id.toString()} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500">{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{p.bankName}</td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="text-xs">
                          <span className="block font-medium text-slate-700">{p.accountName}</span>
                          <span className="font-mono">{p.accountNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs max-w-[200px] truncate">
                        {p.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
