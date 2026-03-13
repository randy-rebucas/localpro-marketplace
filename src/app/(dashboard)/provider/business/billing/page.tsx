import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import AgencyBillingClient from "./_components/AgencyBillingClient";

export const metadata: Metadata = { title: "Agency Subscription & Billing" };

export default async function AgencyBillingPage() {
  await requireBusinessProvider();
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-52 bg-slate-200 rounded-xl" />
      </div>
    }>
      <AgencyBillingClient />
    </Suspense>
  );
}
