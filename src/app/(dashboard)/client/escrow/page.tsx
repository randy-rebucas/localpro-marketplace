import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { paymentService } from "@/services";
import { paymentRepository, transactionRepository } from "@/repositories";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { Suspense } from "react";
import EscrowTabs from "./EscrowTabs";

export const metadata: Metadata = { title: "Escrow" };

interface EscrowPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function EscrowSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-28" />
      ))}
    </div>
  );
}

// ─── Async data section ───────────────────────────────────────────────────────

async function EscrowContent({
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
        // Need full user token for paymentService — re-fetch current user context
        const { getCurrentUser } = await import("@/lib/auth");
        const user = await getCurrentUser();
        if (user) {
          const result = await paymentService.pollCheckoutSession(user, payment.paymentIntentId, sessionJobId);
          paymentConfirmed = result.status === "paid";
        }
      }
    } catch {
      // silently ignore — page still renders without the confirmation banner
    }
  }

  const [jobs, totalLocked] = await Promise.all([
    jobRepository.findEscrowJobsForClient(userId),
    transactionRepository.sumPendingByPayer(userId),
  ]);

  // Fetch actual paid amounts from Payment records, keyed by jobId
  const jobIds = jobs.map((j) => j._id.toString());
  const fundedAmounts = await paymentRepository.findAmountsByJobIds(jobIds);

  const needsAction = jobs.filter(
    (j) => (j.status === "assigned" && j.escrowStatus === "not_funded") || (j.status === "completed" && j.escrowStatus === "funded")
  );
  const inProgress = jobs.filter((j) => j.escrowStatus === "funded" && j.status !== "completed" && j.status !== "disputed");
  const disputed = jobs.filter((j) => j.status === "disputed");
  const done = jobs.filter((j) => j.escrowStatus === "released");

  // Serialize jobs for the client component
  const serialize = (arr: typeof jobs) =>
    JSON.parse(JSON.stringify(arr)) as Parameters<typeof EscrowTabs>[0]["needsAction"];

  return (
    <>
      {paymentConfirmed && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Payment confirmed! Escrow has been funded. The provider can now begin work.
          </p>
        </div>
      )}

      {totalLocked > 0 && (
        <div className="flex justify-end">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-right">
            <p className="text-xs text-amber-600 font-medium">Total Locked</p>
            <p className="text-xl font-bold text-amber-800">{formatCurrency(totalLocked)}</p>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No jobs requiring escrow action.
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EscrowPage({ searchParams }: EscrowPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      {/* Header streams immediately — no data dependency */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Escrow</h2>
        <p className="text-slate-500 text-sm mt-0.5">Manage escrow payments for your jobs.</p>
      </div>

      {/* Payment check + jobs list stream in once both DB queries + optional poll resolve */}
      <Suspense fallback={<EscrowSkeleton />}>
        <EscrowContent userId={user.userId} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
