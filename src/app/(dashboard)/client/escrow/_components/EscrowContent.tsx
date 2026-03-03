import { CheckCircle, ShieldCheck, Zap, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { jobRepository } from "@/repositories/job.repository";
import { paymentService } from "@/services";
import { paymentRepository } from "@/repositories";
import EscrowTabs from "./EscrowTabs";
import type { EscrowJobClient } from "./EscrowTabs";

export async function EscrowContent({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Resolve payment redirect query params
  const params = await searchParams;
  const sessionJobId = params.jobId;
  const paymentSuccess = params.payment === "success";
  let paymentConfirmed = false;

  if (paymentSuccess && sessionJobId && process.env.PAYMONGO_SECRET_KEY) {
    try {
      const payment = await paymentRepository.findByJobId(sessionJobId);
      if (payment) {
        const { getCurrentUser } = await import("@/lib/auth");
        const user = await getCurrentUser();
        if (user) {
          const result = await paymentService.pollCheckoutSession(
            user,
            payment.paymentIntentId,
            sessionJobId
          );
          paymentConfirmed = result.status === "paid";
        }
      }
    } catch {
      // silently ignore
    }
  }

  const jobs = await jobRepository.findEscrowJobsForClient(userId);

  // Fetch actual paid amounts from Payment records, keyed by jobId
  const jobIds = jobs.map((j) => j._id.toString());
  const fundedAmounts = await paymentRepository.findAmountsByJobIds(jobIds);

  // Compute remaining locked escrow (net of released milestones)
  const totalLocked = jobs
    .filter((j) => j.escrowStatus === "funded")
    .reduce((sum, job) => {
      const funded = fundedAmounts.get(job._id.toString()) ?? job.budget;
      const released = (job.milestones ?? [])
        .filter((m) => m.status === "released")
        .reduce((s, m) => s + m.amount, 0);
      return sum + Math.max(0, funded - released);
    }, 0);

  const needsAction = jobs.filter(
    (j) =>
      (j.status === "assigned" && j.escrowStatus === "not_funded") ||
      (j.status === "completed" && j.escrowStatus === "funded")
  );
  const inProgress = jobs.filter(
    (j) =>
      j.escrowStatus === "funded" &&
      j.status !== "completed" &&
      j.status !== "disputed"
  );
  const disputed = jobs.filter((j) => j.status === "disputed");
  const done = jobs.filter((j) => j.escrowStatus === "released");

  const serialize = (arr: typeof jobs) =>
    JSON.parse(JSON.stringify(arr)) as EscrowJobClient[];

  /* ── Stats strip ── */
  const stats = [
    {
      label: "Locked in Escrow",
      value: totalLocked > 0 ? formatCurrency(totalLocked) : "₱0",
      icon: <Lock className="h-4 w-4 text-amber-500" />,
      bg: "bg-amber-50",
    },
    {
      label: "Needs Action",
      value: String(needsAction.length),
      icon: <Zap className="h-4 w-4 text-primary" />,
      bg: "bg-primary/5",
    },
    {
      label: "Total Jobs",
      value: String(jobs.length),
      icon: <ShieldCheck className="h-4 w-4 text-slate-400" />,
      bg: "bg-slate-50",
    },
  ];

  return (
    <>
      {/* Payment confirmed banner */}
      {paymentConfirmed && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Payment confirmed!</p>
            <p className="text-xs text-green-700 mt-0.5">
              Escrow has been funded. The provider can now begin work.
            </p>
          </div>
        </div>
      )}

      {/* Stats strip */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 ${s.bg}`}
            >
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{s.label}</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-14 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">No escrow jobs yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Once you accept a provider&apos;s quote, fund escrow here to start the job.
              Your payment is protected until you approve the completed work.
            </p>
          </div>
        </div>
      ) : (
        <EscrowTabs
          needsAction={serialize(needsAction)}
          inProgress={serialize(inProgress)}
          disputed={serialize(disputed)}
          done={serialize(done)}
          fundedAmounts={Object.fromEntries(fundedAmounts)}
        />
      )}
    </>
  );
}
