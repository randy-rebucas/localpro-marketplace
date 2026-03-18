import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import TourGuide from "@/components/shared/TourGuide";
import { JobsData } from "./_components/JobsData";
import { JobsSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "My Jobs" };

export default async function ClientJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("clientPages");

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="client-jobs"
        title="How My Jobs works"
        steps={[
          { icon: "📂", title: "See all your jobs",  description: "All jobs you've posted are listed here — open, assigned, in progress, and completed." },
          { icon: "👆", title: "Click to manage",    description: "Click any job to view quotes from providers, accept the best one, and take action." },
          { icon: "🤝", title: "Accept a quote",     description: "Accepting a quote locks in your provider. Fund escrow to officially start the job." },
          { icon: "📡", title: "Live updates",       description: "Job statuses update in real time when providers take action — no need to refresh." },
        ]}
      />
      <RealtimeRefresher entity="job" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("jobs")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("jobsSub")}
          </p>
        </div>
        <Link href="/client/post-job" className="btn-primary flex-shrink-0 mt-1">
          {t("postJob")}
        </Link>
      </div>

      {/* List streams in once DB queries resolve */}
      <Suspense fallback={<JobsSkeleton />}>
        <JobsData userId={user.userId} />
      </Suspense>
    </div>
  );
}
