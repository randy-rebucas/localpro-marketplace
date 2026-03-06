import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { MarketplaceContent } from "./_components/MarketplaceContent";
import { MarketplaceSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { ref } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketplace</h2>
          <p className="text-slate-500 text-sm mt-1">Browse open jobs and submit competitive quotes.</p>
        </div>
      </div>

      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceContent userId={user.userId} refJobId={ref} />
      </Suspense>
    </div>
  );
}
