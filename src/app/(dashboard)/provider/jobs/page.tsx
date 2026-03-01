import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import Link from "next/link";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ProviderJobsList from "./ProviderJobsList";
import PageGuide from "@/components/shared/PageGuide";
import type { IJob } from "@/types";

export const metadata: Metadata = { title: "My Jobs" };


function JobsListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-40 bg-slate-200 rounded" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-32" />
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

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
        No active jobs.{" "}
        <Link href="/provider/marketplace" className="text-primary hover:underline">Browse the marketplace.</Link>
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
      <PageGuide
        pageKey="provider-jobs"
        title="How My Jobs works"
        steps={[
          { icon: "📋", title: "All assigned jobs", description: "See every job that's been assigned to you — from accepted quotes through to completion." },
          { icon: "📸", title: "Upload before photos", description: "When starting a job, upload before photos to document the initial state of the work area." },
          { icon: "✅", title: "Mark as complete", description: "Once the work is done, upload after photos and mark the job complete to trigger escrow release." },
          { icon: "💰", title: "Track payments", description: "See the funded escrow amount for each job so you know exactly what you'll be paid." },
        ]}
      />
      <RealtimeRefresher entity="job" />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Active Jobs</h2>
      </div>
      <Suspense fallback={<JobsListSkeleton />}>
        <ProviderJobsContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
