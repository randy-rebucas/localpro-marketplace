import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import { JobsContent } from "./_components/JobsContent";
import { JobsListSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "My Jobs" };

export default async function ProviderJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = await getTranslations("providerPages");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t("jobs")}</h2>
          <p className="text-slate-500 text-sm mt-1">{t("jobsSub")}</p>
        </div>
      </div>
      <RealtimeRefresher entity="job" />
      <Suspense fallback={<JobsListSkeleton />}>
        <JobsContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
