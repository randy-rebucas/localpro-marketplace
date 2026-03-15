import { payoutService } from "@/services/payout.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Clock, CheckCircle2, XCircle, Loader2, CircleDollarSign, ArrowUpRight, TrendingUp } from "lucide-react";
import type { IPayout, PayoutStatus } from "@/types";
import RequestPayoutModal from "@/components/payment/RequestPayoutModal";
import type { TokenPayload } from "@/lib/auth";

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

export async function PayoutsContent({ user }: { user: TokenPayload }) {
  const { payouts, availableBalance, totalNetEarned, pendingInEscrow, payoutStats } =
    await payoutService.listProviderPayouts(user);

  const totalInflight = payoutStats.totalPending + payoutStats.totalProcessing;

  return (
    <>
      {/* Accounting stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Total Net Earned</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalNetEarned)}</p>
              <p className="text-xs text-slate-400 mt-0.5">All completed jobs</p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-amber-600 font-medium">Pending in Escrow</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{formatCurrency(pendingInEscrow)}</p>
              <p className="text-xs text-amber-500 mt-0.5">Awaiting client release</p>
            </div>
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Total Paid Out</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1">{formatCurrency(payoutStats.totalCompleted)}</p>
              <p className="text-xs text-green-500 mt-0.5">Completed withdrawals</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-xl text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className={`rounded-xl border shadow-sm p-5 ${availableBalance > 0 ? "bg-primary/5 border-primary/20" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-medium ${availableBalance > 0 ? "text-primary" : "text-slate-500"}`}>Available to Withdraw</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${availableBalance > 0 ? "text-primary" : "text-slate-400"}`}>{formatCurrency(availableBalance)}</p>
              <p className={`text-xs mt-0.5 ${totalInflight > 0 ? "text-slate-400" : availableBalance > 0 ? "text-primary/70" : "text-slate-400"}`}>
                {totalInflight > 0 ? `₱${totalInflight.toLocaleString()} in-flight` : "Ready now"}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${availableBalance > 0 ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Available balance banner */}
      {availableBalance > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
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
          <div className="flex-shrink-0">
            <RequestPayoutModal availableBalance={availableBalance} />
          </div>
        </div>
      )}

      {/* Payouts table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
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
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y divide-slate-100">
              {(payouts as unknown as IPayout[]).map((p) => {
                const cfg = statusConfig[p.status];
                return (
                  <div key={p._id.toString()} className="px-4 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(p.amount)}</p>
                        {p.withdrawalFee != null && p.withdrawalFee > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Fee: <span className="text-red-500">−{formatCurrency(p.withdrawalFee)}</span>
                            {" · "}
                            Net: <span className="text-green-600 font-medium">{formatCurrency(p.amount - p.withdrawalFee)}</span>
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">{p.bankName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${cfg.classes}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-0.5">
                      <p><span className="font-medium text-slate-600">{p.accountName}</span> · <span className="font-mono">{p.accountNumber}</span></p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{formatDate(p.createdAt)}</span>
                        {p.notes && <span className="truncate max-w-[200px] text-slate-400">{p.notes}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* sm+: table */}
            <div className="hidden sm:block overflow-x-auto">
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
                          <span>{formatCurrency(p.amount)}</span>
                          {p.withdrawalFee != null && p.withdrawalFee > 0 && (
                            <div className="mt-0.5 text-xs font-normal text-slate-400">
                              Fee: <span className="text-red-500">−{formatCurrency(p.withdrawalFee)}</span>
                              {" · "}
                              Net: <span className="text-green-600">{formatCurrency(p.amount - p.withdrawalFee)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-700">{p.bankName}</td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="text-xs">
                            <span className="block font-medium text-slate-700">{p.accountName}</span>
                            <span className="font-mono">{p.accountNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
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
          </>
        )}
      </div>
    </>
  );
}
