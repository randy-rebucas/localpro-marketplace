import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { payoutService } from "@/services/payout.service";
import { jobRepository } from "@/repositories/job.repository";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  Banknote,
} from "lucide-react";
import type { IPayout, IUser, PayoutStatus } from "@/types";
import PayoutActions from "./PayoutActions";
import TourGuide from "@/components/shared/TourGuide";
import AdminEscrowReleaseCard from "./AdminEscrowReleaseCard";

export const metadata: Metadata = { title: "Manage Payouts" };


const statusConfig: Record<PayoutStatus, { label: string; classes: string; icon: React.ReactNode }> = {
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

type PopulatedPayout = Omit<IPayout, "providerId"> & {
  providerId: Pick<IUser, "_id" | "name" | "email"> | null;
};

export default async function AdminPayoutsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const [allPayouts, releaseJobs] = await Promise.all([
    payoutService.listAllPayouts() as Promise<unknown>,
    jobRepository.findAwaitingPaymentRelease(),
  ]);

  const typedPayouts = allPayouts as unknown as PopulatedPayout[];

  const pending = typedPayouts.filter((p) => p.status === "pending");
  const processing = typedPayouts.filter((p) => p.status === "processing");
  const done = typedPayouts.filter((p) => p.status === "completed" || p.status === "rejected");

  const totalPendingAmount = [...pending, ...processing].reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Payouts &amp; Payments</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage provider payout requests and release escrow payments for completed jobs.
          </p>
        </div>
      </div>

      <TourGuide
        pageKey="admin-payouts"
        title="How Payouts & Payments works"
        steps={[
          { icon: "📥", title: "Review requests", description: "Providers submit payout requests with their bank details. Pending requests need your attention first." },
          { icon: "🔍", title: "Verify details", description: "Check the provider's available balance and confirm bank account details before approving." },
          { icon: "▶️", title: "Approve & process", description: "Mark as Processing when you initiate the bank transfer, then Complete once funds are sent." },
          { icon: "❌", title: "Reject if needed", description: "Reject with a clear reason (e.g. invalid bank details) so the provider can resubmit correctly." },
        ]}
      />

      {/* ═══════════════════════════════════════════
          SECTION 1 — Pending Payment Releases
          (completed jobs with funded escrow)
          ═══════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Pending Payment Releases</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Completed jobs with locked escrow — release to credit the provider&apos;s earnings.
            </p>
          </div>
          {releaseJobs.length > 0 && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
              {releaseJobs.length} pending
            </span>
          )}
        </div>

        {releaseJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
              <Banknote className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">No payments awaiting release</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">All completed jobs have been settled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {releaseJobs.map((job) => (
              <AdminEscrowReleaseCard
                key={job._id.toString()}
                jobId={job._id.toString()}
                jobTitle={job.title}
                category={job.category}
                budget={job.budget}
                completedAt={job.updatedAt.toISOString()}
                client={{ name: job.clientId.name, email: job.clientId.email }}
                provider={
                  job.providerId
                    ? {
                        id: job.providerId._id.toString(),
                        name: job.providerId.name,
                        email: job.providerId.email,
                      }
                    : null
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — Payout Requests
          (providers requesting wallet withdrawal)
          ═══════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Payout Requests</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Providers requesting to withdraw their earnings to their bank account.
              {totalPendingAmount > 0 && (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  · {formatCurrency(totalPendingAmount)} total pending
                </span>
              )}
            </p>
          </div>
          {pending.length + processing.length > 0 && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
              {pending.length + processing.length} awaiting action
            </span>
          )}
        </div>

        {pending.length === 0 && processing.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
              <Wallet className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">No pending payout requests</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...pending, ...processing].map((payout) => {
              const cfg = statusConfig[payout.status];
              return (
                <div
                  key={payout._id.toString()}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                            {formatCurrency(payout.amount)}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.classes}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Requested by{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {payout.providerId?.name ?? "(deleted user)"}
                          </span>{" "}
                          <span className="text-slate-400 dark:text-slate-500">({payout.providerId?.email ?? "—"})</span>
                          <span className="text-slate-300 dark:text-slate-600 mx-2">·</span>
                          {formatDate(payout.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Bank details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Bank / Channel</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{payout.bankName}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Account Name</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{payout.accountName}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Account Number</p>
                        <p className="text-sm font-mono font-semibold text-slate-800 dark:text-white">
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

        {/* History */}
        {done.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white">Payout History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Date</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Provider</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Amount</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Bank</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Account</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {done.map((p) => {
                    const cfg = statusConfig[p.status];
                    return (
                      <tr key={p._id.toString()} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(p.createdAt)}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-800 dark:text-white">{p.providerId?.name ?? "(deleted user)"}</span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500">{p.providerId?.email ?? "—"}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{p.bankName}</td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                          <div className="text-xs">
                            <span className="block font-semibold text-slate-700 dark:text-slate-200">{p.accountName}</span>
                            <span className="font-mono">{p.accountNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.classes}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 dark:text-slate-500 text-xs max-w-[180px] truncate">
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
      </section>
    </div>
  );
}
