import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import ExportEarningsButton from "@/components/payment/ExportEarningsButton";
import { EarningsContent } from "./_components/EarningsContent";
import { EarningsSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Earnings</h2>
          <p className="hidden sm:block text-slate-500 text-sm mt-1">Commission breakdown and payment history.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 mt-1">
          <Link
            href="/provider/payouts"
            className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors whitespace-nowrap"
          >
            Payouts
          </Link>
          <ExportEarningsButton />
        </div>
      </div>
      <Suspense fallback={<EarningsSkeleton />}>
        <EarningsContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
