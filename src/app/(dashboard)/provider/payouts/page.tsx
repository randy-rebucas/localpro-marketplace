import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PayoutsContent } from "./_components/PayoutsContent";
import { PayoutsSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Payouts" };

export default async function ProviderPayoutsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = await getTranslations("providerPages");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t("payouts")}</h2>
          <p className="hidden sm:block text-slate-500 text-sm mt-1">{t("payoutsSub")}</p>
        </div>
        <div className="flex-shrink-0 mt-1">
          <Link
            href="/provider/earnings"
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
          >
            {t("viewEarnings")}
          </Link>
        </div>
      </div>
      <Suspense fallback={<PayoutsSkeleton />}>
        <PayoutsContent user={user} />
      </Suspense>
    </div>
  );
}
