import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { paymentService } from "@/services";
import { paymentRepository } from "@/repositories";
import { EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle, Zap, Clock, CircleCheck } from "lucide-react";
import ProviderInfoButton from "@/components/shared/ProviderInfoButton";
import type { IJob } from "@/types";

export const metadata: Metadata = { title: "Escrow" };


interface EscrowPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EscrowPage({ searchParams }: EscrowPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Handle PayMongo checkout session redirect
  const params = await searchParams;
  const sessionJobId = params.jobId;
  const paymentSuccess = params.payment === "success";
  let paymentConfirmed = false;

  if (paymentSuccess && sessionJobId && process.env.PAYMONGO_SECRET_KEY) {
    try {
      // Look up the checkout session ID from the stored payment record (avoids
      // relying on PayMongo's {CHECKOUT_SESSION_ID} URL placeholder)
      const payment = await paymentRepository.findByJobId(sessionJobId);
      if (payment) {
        const sid = (payment as unknown as { paymentIntentId: string }).paymentIntentId;
        const result = await paymentService.pollCheckoutSession(user, sid, sessionJobId);
        paymentConfirmed = result.status === "paid";
      }
    } catch {
      // silently ignore — page still renders without the confirmation banner
    }
  }

  await connectDB();

  const jobs = await Job.find({
    clientId: user.userId,
    status: { $in: ["assigned", "in_progress", "completed"] },
  })
    .select("title category budget status escrowStatus providerId createdAt partialReleaseAmount")
    .populate("providerId", "name email isVerified")
    .sort({ createdAt: -1 })
    .lean();

  const totalLocked = jobs
    .filter((j) => j.escrowStatus === "funded")
    .reduce((sum, j) => sum + j.budget, 0);

  return (
    <div className="space-y-6">
      {paymentConfirmed && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Payment confirmed! Escrow has been funded. The provider can now begin work.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Escrow</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage escrow payments for your jobs.</p>
        </div>
        {totalLocked > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-right">
            <p className="text-xs text-amber-600 font-medium">Total Locked</p>
            <p className="text-xl font-bold text-amber-800">{formatCurrency(totalLocked)}</p>
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No jobs requiring escrow action.
        </div>
      ) : (() => {
        const needsAction = (jobs as unknown as (IJob & { providerId?: { _id: string; name: string; email: string; isVerified: boolean } })[]).filter(
          (j) => (j.status === "assigned" && j.escrowStatus === "not_funded") || (j.status === "completed" && j.escrowStatus === "funded")
        );
        const inProgress = (jobs as unknown as (IJob & { providerId?: { _id: string; name: string; email: string; isVerified: boolean } })[]).filter(
          (j) => j.escrowStatus === "funded" && j.status !== "completed"
        );
        const done = (jobs as unknown as (IJob & { providerId?: { _id: string; name: string; email: string; isVerified: boolean } })[]).filter(
          (j) => j.escrowStatus === "released"
        );

        function EscrowCard({ j }: { j: IJob & { providerId?: { _id: string; name: string; email: string; isVerified: boolean } } }) {
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/client/jobs/${j._id}`} className="font-semibold text-slate-900 hover:text-primary text-sm">
                    {j.title}
                  </Link>
                  <p className="text-xs text-slate-400 mt-1">
                    Provider: <span className="font-medium text-slate-600">{j.providerId?.name ?? "—"}</span>
                    {" · "}Scheduled {formatDate(j.scheduleDate)}
                  </p>
                  {j.providerId?._id && (
                    <div className="mt-1.5">
                      <ProviderInfoButton
                        providerId={j.providerId._id.toString()}
                        providerName={j.providerId.name}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(j.budget)}</p>
                  <EscrowBadge status={j.escrowStatus} />
                  {j.status === "assigned" && j.escrowStatus === "not_funded" && (
                    <Link href={`/client/jobs/${j._id}`} className="btn-primary text-xs py-1.5 px-3">
                      Fund Escrow →
                    </Link>
                  )}
                  {j.status === "completed" && j.escrowStatus === "funded" && (
                    <Link href={`/client/jobs/${j._id}`} className="text-xs py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
                      Release Payment →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {needsAction.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Needs Your Action</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{needsAction.length}</span>
                </div>
                <div className="space-y-3">
                  {needsAction.map((j) => <EscrowCard key={j._id.toString()} j={j} />)}
                </div>
              </div>
            )}
            {inProgress.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-700">In Progress</h3>
                </div>
                <div className="space-y-3">
                  {inProgress.map((j) => <EscrowCard key={j._id.toString()} j={j} />)}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CircleCheck className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Completed</h3>
                </div>
                <div className="space-y-3">
                  {done.map((j) => <EscrowCard key={j._id.toString()} j={j} />)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
