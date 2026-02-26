import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ITransaction, IJob } from "@/types";

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const transactions = await Transaction.find({ payeeId: user.userId })
    .sort({ createdAt: -1 })
    .populate("jobId", "title")
    .lean() as unknown as (ITransaction & { jobId: { title: string } })[];

  const completed = transactions.filter((t) => t.status === "completed");
  const totalGross = completed.reduce((s, t) => s + t.amount, 0);
  const totalCommission = completed.reduce((s, t) => s + t.commission, 0);
  const totalNet = completed.reduce((s, t) => s + t.netAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Earnings</h2>
        <p className="text-slate-500 text-sm mt-0.5">Commission breakdown and payment history.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Gross Earned", value: formatCurrency(totalGross), desc: "Before commission" },
          { label: "Commission Paid", value: formatCurrency(totalCommission), desc: "10% platform fee" },
          { label: "Net Received", value: formatCurrency(totalNet), desc: "Your take-home pay" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Transaction History</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No transactions yet.</div>
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
                  <tr key={t._id.toString()} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {(t.jobId as unknown as IJob & { title: string })?.title ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-right text-red-500">-{formatCurrency(t.commission)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(t.netAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${t.status === "completed" ? "bg-green-100 text-green-700" : t.status === "refunded" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>
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
    </div>
  );
}
