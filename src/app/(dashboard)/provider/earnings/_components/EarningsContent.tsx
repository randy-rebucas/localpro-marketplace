import { transactionRepository } from "@/repositories/transaction.repository";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleDollarSign, TrendingDown, Wallet, ArrowUpRight, Clock, CalendarDays } from "lucide-react";
import { payoutService } from "@/services/payout.service";
import RequestPayoutModal from "@/components/payment/RequestPayoutModal";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function EarningsContent({ userId }: { userId: string }) {
  const [transactions, totals, availableBalance, thisMonth, pendingInEscrow, monthly] = await Promise.all([
    transactionRepository.findByPayeeWithJob(userId),
    transactionRepository.sumCompletedByPayee(userId),
    payoutService.getAvailableBalance(userId),
    transactionRepository.sumCurrentMonthByPayee(userId),
    transactionRepository.sumPendingByPayee(userId),
    transactionRepository.sumMonthlyByPayee(userId, 6),
  ]);

  const { gross: totalGross, commission: totalCommission, net: totalNet } = totals;
  const commissionPct = totalGross > 0 ? Math.round((totalCommission / totalGross) * 100) : 10;
  const netPct = 100 - commissionPct;

  // Monthly bar chart — scale relative to the highest net month
  const maxNet = Math.max(...monthly.map((m) => m.net), 1);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Gross Earned</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalGross)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Before commission</p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Commission Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-red-500 mt-1">-{formatCurrency(totalCommission)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{commissionPct}% platform fee</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl text-red-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Net Received</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalNet)}</p>
              <p className="text-xs text-green-500 mt-0.5">Total take-home</p>
            </div>
            <div className="p-2.5 bg-green-100 rounded-xl text-green-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">This Month</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatCurrency(thisMonth)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Net released</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-amber-600 font-medium">Pending in Escrow</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{formatCurrency(pendingInEscrow)}</p>
              <p className="text-xs text-amber-500 mt-0.5">Awaiting release</p>
            </div>
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className={`rounded-xl border shadow-sm p-5 ${availableBalance > 0 ? "bg-primary/5 border-primary/20" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-medium ${availableBalance > 0 ? "text-primary" : "text-slate-500"}`}>
                Ready to Payout
              </p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${availableBalance > 0 ? "text-primary" : "text-slate-400"}`}>
                {formatCurrency(availableBalance)}
              </p>
              <p className={`text-xs mt-0.5 ${availableBalance > 0 ? "text-primary/70" : "text-slate-400"}`}>
                Available now
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
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

      {/* Monthly earnings chart */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
            Monthly Earnings (last 6 months)
          </p>
          <div className="flex items-end gap-2 h-28">
            {monthly.map((m) => {
              const heightPct = Math.max((m.net / maxNet) * 100, 4);
              return (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex justify-center">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                      <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                        <p className="font-semibold">{formatCurrency(m.net)} net</p>
                        <p className="text-slate-300">{m.jobs} job{m.jobs !== 1 ? "s" : ""}</p>
                        <p className="text-red-300">-{formatCurrency(m.commission)} fee</p>
                      </div>
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                    </div>
                    <div
                      className="w-full rounded-t-md bg-primary/20 hover:bg-primary/40 transition-colors cursor-default"
                      style={{ height: `${heightPct}%`, minHeight: "4px", maxHeight: "96px" }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{MONTH_NAMES[(m.month - 1) % 12]}</span>
                </div>
              );
            })}
          </div>
          {/* Monthly table below chart */}
          <div className="mt-4 divide-y divide-slate-100">
            {[...monthly].reverse().map((m) => (
              <div key={`row-${m.year}-${m.month}`} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-500">{MONTH_NAMES[(m.month - 1) % 12]} {m.year}</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-xs hidden sm:inline">{m.jobs} job{m.jobs !== 1 ? "s" : ""}</span>
                  <span className="text-red-400 text-xs hidden sm:inline">-{formatCurrency(m.commission)}</span>
                  <span className="font-semibold text-green-600">{formatCurrency(m.net)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout button */}
      <div className="flex justify-end">
        <RequestPayoutModal availableBalance={availableBalance} />
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
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
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y divide-slate-100">
              {transactions.map((t) => {
                const badgeCls = t.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : t.status === "refunded"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-amber-100 text-amber-700";
                return (
                  <div key={String(t._id)} className="px-4 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900 leading-snug">{t.jobId?.title ?? "—"}</p>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-base font-bold text-green-600">{formatCurrency(t.netAmount)}</span>
                        <span className={`badge ${badgeCls}`}>{t.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      <span>Gross: {formatCurrency(t.amount)}</span>
                      <span className="text-red-400">Fee: -{formatCurrency(t.commission)}</span>
                      <span>{formatDate(t.createdAt)}</span>
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
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Job</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Gross</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Commission</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Net</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Date</th>
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
          </>
        )}
      </div>
    </>
  );
}
