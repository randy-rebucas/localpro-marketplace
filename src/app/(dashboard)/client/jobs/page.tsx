import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import Link from "next/link";
import type { IJob } from "@/types";
import { Suspense } from "react";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ClientJobsList from "./ClientJobsList";

export const metadata: Metadata = { title: "My Jobs" };

function JobsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-24" />
      ))}
    </div>
  );
}

async function JobsData({ userId }: { userId: string }) {
  const jobs = await jobRepository.findAllForClient(userId);
  const jobIds = jobs.map((j) => j._id);
  const quoteCounts = await quoteRepository.countPendingByJobIds(jobIds);
  const quoteCountMap = new Map(quoteCounts.map((q) => [String(q._id), q.count]));

  // Serialize for client component (ObjectIds → strings, Dates → ISO strings)
  const jobsForClient = JSON.parse(JSON.stringify(jobs)) as (IJob & {
    providerId?: { _id: string; name: string; email: string; isVerified: boolean };
  })[];
  const quoteCountObj = Object.fromEntries(quoteCountMap);

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

  return <ClientJobsList jobs={jobsForClient} quoteCountMap={quoteCountObj} />;
}

export default async function ClientJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="job" />
      {/* Header streams immediately — no data dependency */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Jobs</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage and track your posted jobs.</p>
        </div>
        <Link href="/client/post-job" className="btn-primary">+ Post a Job</Link>
      </div>

      {/* List streams in once DB queries resolve */}
      <Suspense fallback={<JobsSkeleton />}>
        <JobsData userId={user.userId} />
      </Suspense>
    </div>
  );
}
