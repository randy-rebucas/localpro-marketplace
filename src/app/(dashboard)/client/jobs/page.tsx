import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import Link from "next/link";
import type { IJob } from "@/types";
import { Suspense } from "react";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ClientJobsList from "./ClientJobsList";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "My Jobs" };

function JobsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-28 rounded bg-slate-100" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-20 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function JobsData({ userId }: { userId: string }) {
  const jobs = await jobRepository.findAllForClient(userId);
  const jobIds = jobs.map((j) => j._id);
  const [quoteCounts, fundedMap] = await Promise.all([
    quoteRepository.countPendingByJobIds(jobIds),
    paymentRepository.findAmountsByJobIds(jobIds.map(String)),
  ]);
  const quoteCountMap = new Map(quoteCounts.map((q) => [String(q._id), q.count]));

  // Serialize for client component (ObjectIds → strings, Dates → ISO strings)
  const jobsForClient = JSON.parse(JSON.stringify(jobs)) as (IJob & {
    providerId?: { _id: string; name: string; email: string; isVerified: boolean };
  })[];
  const quoteCountObj = Object.fromEntries(quoteCountMap);
  const fundedAmounts = Object.fromEntries(fundedMap);

  if (jobsForClient.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400 text-sm">No jobs posted yet.</p>
        <Link href="/client/post-job" className="mt-3 inline-block btn-primary text-xs">
          Post your first job
        </Link>
      </div>
    );
  }

  return <ClientJobsList jobs={jobsForClient} quoteCountMap={quoteCountObj} fundedAmounts={fundedAmounts} />;
}

export default async function ClientJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="client-jobs"
        title="How My Jobs works"
        steps={[
          { icon: "📂", title: "See all your jobs", description: "All jobs you've posted are listed here — open, assigned, in progress, and completed." },
          { icon: "👆", title: "Click to manage", description: "Click any job to view quotes from providers, accept the best one, and take action." },
          { icon: "🤝", title: "Accept a quote", description: "Accepting a quote locks in your provider. Fund escrow to officially start the job." },
          { icon: "📡", title: "Live updates", description: "Job statuses update in real time when providers take action — no need to refresh." },
        ]}
      />
      <RealtimeRefresher entity="job" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Jobs</h2>
          <p className="text-slate-500 text-sm mt-1">Manage and track your posted jobs.</p>
        </div>
        <Link href="/client/post-job" className="btn-primary flex-shrink-0 mt-1">+ Post a Job</Link>
      </div>

      {/* List streams in once DB queries resolve */}
      <Suspense fallback={<JobsSkeleton />}>
        <JobsData userId={user.userId} />
      </Suspense>
    </div>
  );
}
