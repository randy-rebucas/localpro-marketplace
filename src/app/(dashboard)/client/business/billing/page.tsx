import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import { Suspense } from "react";
import BillingClient from "./_components/BillingClient";

export const metadata: Metadata = { title: "Subscription & Billing" };

export default async function BillingPage() {
  await requireBusinessClient();
  return (
    <Suspense fallback={<div className="p-6 animate-pulse space-y-4"><div className="h-8 w-60 bg-slate-200 rounded" /><div className="h-40 bg-slate-200 rounded-xl" /></div>}>
      <BillingClient />
    </Suspense>
  );
}
