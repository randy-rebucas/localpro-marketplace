import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import { JobsContent } from "./_components/JobsContent";
import { JobsListSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "My Jobs" };

export default async function ProviderJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Jobs</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your active and completed job assignments.</p>
        </div>
      </div>
      <RealtimeRefresher entity="job" />
      <Suspense fallback={<JobsListSkeleton />}>
        <JobsContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
