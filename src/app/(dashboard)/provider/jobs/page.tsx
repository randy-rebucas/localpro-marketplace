import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import Link from "next/link";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ProviderJobsList from "./ProviderJobsList";
import type { IJob } from "@/types";
import { Briefcase } from "lucide-react";

export const metadata: Metadata = { title: "My Jobs" };


function JobsListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-16 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
              <div className="h-3 w-full rounded bg-slate-100" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-7 w-20 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <div className="h-8 w-28 rounded-lg bg-slate-100" />
            <div className="h-8 w-24 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ProviderJobsContent({ userId }: { userId: string }) {
  const jobs = await jobRepository.findActiveJobsForProvider(userId);

  const serialized = JSON.parse(JSON.stringify(jobs)) as (IJob & {
    clientId: { name: string };
    beforePhoto: string[];
    afterPhoto: string[];
  })[];

  // Normalize legacy docs where the field may be a string instead of an array
  for (const j of serialized) {
    if (!Array.isArray(j.beforePhoto)) j.beforePhoto = j.beforePhoto ? [j.beforePhoto as unknown as string] : [];
    if (!Array.isArray(j.afterPhoto))  j.afterPhoto  = j.afterPhoto  ? [j.afterPhoto  as unknown as string] : [];
  }

  // Fetch paid payment amounts keyed by jobId
  const jobIds = serialized.map((j) => j._id.toString());
  const paymentAmounts = await paymentRepository.findAmountsByJobIds(jobIds);
  const fundedMap: Record<string, number> = {};
  for (const [k, v] of paymentAmounts) fundedMap[k] = v;

  // Sort jobs by status: in_progress > assigned > completed > others
  const statusOrder = { in_progress: 0, assigned: 1, completed: 2 };
  serialized.sort((a, b) => {
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
    return aOrder - bOrder;
  });

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-14 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
          <Briefcase className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">No active jobs yet</p>
          <p className="text-xs text-slate-400 mt-1">Accept a quote from the marketplace to get started.</p>
        </div>
        <Link href="/provider/marketplace" className="text-xs font-medium text-primary hover:underline">
          Browse the marketplace →
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-slate-500 text-sm">{jobs.length} job{jobs.length !== 1 ? "s" : ""} assigned to you</p>
      <ProviderJobsList jobs={serialized} fundedAmounts={fundedMap} />
    </>
  );
}

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
        <ProviderJobsContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
