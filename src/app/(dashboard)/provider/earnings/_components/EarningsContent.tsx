import { transactionRepository } from "@/repositories/transaction.repository";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleDollarSign, TrendingDown, Wallet, ArrowUpRight } from "lucide-react";
import { payoutService } from "@/services/payout.service";
import RequestPayoutModal from "@/components/payment/RequestPayoutModal";

export async function EarningsContent({ userId }: { userId: string }) {
  const [transactions, totals, availableBalance] = await Promise.all([
    transactionRepository.findByPayeeWithJob(userId),
    transactionRepository.sumCompletedByPayee(userId),
    payoutService.getAvailableBalance(userId),
  ]);

  const { gross: totalGross, commission: totalCommission, net: totalNet } = totals;
  const commissionPct = totalGross > 0 ? Math.round((totalCommission / totalGross) * 100) : 10;
  const netPct = 100 - commissionPct;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Gross Earned</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalGross)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Before commission</p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Commission Paid</p>
              <p className="text-2xl font-bold text-red-500 mt-1">-{formatCurrency(totalCommission)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{commissionPct}% platform fee</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl text-red-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 shadow-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Net Received</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalNet)}</p>
              <p className="text-xs text-green-500 mt-0.5">Your take-home pay</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-xl text-green-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className={`rounded-xl border shadow-card p-5 ${availableBalance > 0 ? "bg-primary/5 border-primary/20" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-medium ${availableBalance > 0 ? "text-primary" : "text-slate-500"}`}>
                Available to Payout
              </p>
              <p className={`text-2xl font-bold mt-1 ${availableBalance > 0 ? "text-primary" : "text-slate-400"}`}>
                {formatCurrency(availableBalance)}
              </p>
              <p className={`text-xs mt-0.5 ${availableBalance > 0 ? "text-primary/70" : "text-slate-400"}`}>
                Ready to withdraw
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${availableBalance > 0 ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Commission breakdown bar */}
      {totalGross > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <p className="text-xs font-medium text-slate-500 mb-3">Earnings breakdown</p>
          <div className="flex rounded-full overflow-hidden h-3">
            <div className="bg-green-400 transition-all" style={{ width: `${netPct}%` }} />
            <div className="bg-red-300 transition-all" style={{ width: `${commissionPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              You receive {netPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" />
              Platform fee {commissionPct}%
            </span>
          </div>
        </div>
      )}

      {/* Payout button */}
      <div className="flex justify-end">
        <RequestPayoutModal availableBalance={availableBalance} />
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Transaction History</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
              <CircleDollarSign className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No transactions yet</p>
            <p className="text-xs text-slate-400">Completed jobs will appear here once escrow is released.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Job</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Gross</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Commission</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Net</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={String(t._id)} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{t.jobId?.title ?? "—"}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-right text-red-500">-{formatCurrency(t.commission)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(t.netAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        t.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : t.status === "refunded"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
