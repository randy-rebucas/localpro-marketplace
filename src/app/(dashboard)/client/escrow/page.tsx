import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import TourGuide from "@/components/shared/TourGuide";
import { EscrowContent } from "./_components/EscrowContent";
import { EscrowSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Escrow" };

interface EscrowPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EscrowPage({ searchParams }: EscrowPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="client-escrow"
        title="How Escrow works"
        steps={[
          { icon: "🔒", title: "Payment protection",   description: "Escrow holds your payment safely until the job is completed to your satisfaction — you're always protected." },
          { icon: "💳", title: "Fund after accepting", description: "Once you accept a provider's quote, fund escrow via PayMongo to officially start the job." },
          { icon: "✅", title: "Release when satisfied", description: "After the provider marks the job done and you're happy with the result, release payment from escrow." },
          { icon: "⚖️", title: "Raise a dispute",      description: "If there's an issue, raise a dispute and our team will mediate. Funds remain held during review." },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escrow</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage escrow payments for your jobs. Funds are held securely until you approve completed work.
          </p>
        </div>
      </div>

      {/* Content streams in once DB queries + optional PayMongo poll resolve */}
      <Suspense fallback={<EscrowSkeleton />}>
        <EscrowContent userId={user.userId} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
