import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { paymentService } from "@/services";
import { paymentRepository, transactionRepository } from "@/repositories";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import EscrowTabs from "./EscrowTabs";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Escrow" };

interface EscrowPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function EscrowSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 w-32 rounded bg-slate-100" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-20 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
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
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3.5">
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-600">Total in Escrow</p>
            <p className="text-xl font-bold text-amber-800 leading-none mt-0.5">{formatCurrency(totalLocked)}</p>
          </div>
          <div className="text-xs text-amber-600 max-w-[200px] text-right leading-snug">
            Funds are held securely until jobs are released
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-14 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
            <ShieldCheck className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No escrow jobs yet</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Once you accept a provider&apos;s quote, fund escrow here to start the job.
          </p>
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
      <PageGuide
        pageKey="client-escrow"
        title="How Escrow works"
        steps={[
          { icon: "🔒", title: "Payment protection", description: "Escrow holds your payment safely until the job is completed to your satisfaction — you're always protected." },
          { icon: "💳", title: "Fund after accepting", description: "Once you accept a provider's quote, fund escrow via PayMongo to officially start the job." },
          { icon: "✅", title: "Release when satisfied", description: "After the provider marks the job done and you're happy with the result, release payment from escrow." },
          { icon: "⚖️", title: "Raise a dispute", description: "If there's an issue, raise a dispute and our team will mediate. Funds remain held during review." },
        ]}
      />
      {/* Header streams immediately — no data dependency */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Escrow</h2>
          <p className="text-slate-500 text-sm mt-1">Manage escrow payments for your jobs.</p>
        </div>
      </div>

      {/* Payment check + jobs list stream in once both DB queries + optional poll resolve */}
      <Suspense fallback={<EscrowSkeleton />}>
        <EscrowContent userId={user.userId} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
