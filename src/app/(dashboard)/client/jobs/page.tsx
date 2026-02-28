import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import Link from "next/link";
import type { IJob } from "@/types";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ClientJobsList from "./ClientJobsList";

export const metadata: Metadata = { title: "My Jobs" };

async function getClientJobs(clientId: string) {
  const jobs = await jobRepository.findAllForClient(clientId);

  const jobIds = jobs.map((j) => j._id);
  const quoteCounts = await quoteRepository.countPendingByJobIds(jobIds);

  const quoteCountMap = new Map(quoteCounts.map((q) => [String(q._id), q.count]));
  return { jobs, quoteCountMap };
}

export default async function ClientJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { jobs, quoteCountMap } = await getClientJobs(user.userId);

  // Serialize for client component (ObjectIds → strings, Dates → ISO strings)
  const jobsForClient = JSON.parse(JSON.stringify(jobs)) as (IJob & { providerId?: { _id: string; name: string; email: string; isVerified: boolean } })[];
  const quoteCountObj = Object.fromEntries(quoteCountMap);

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="job" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Jobs</h2>
          <p className="text-slate-500 text-sm mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/client/post-job" className="btn-primary">+ Post a Job</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No jobs posted yet.</p>
          <Link href="/client/post-job" className="mt-3 inline-block btn-primary text-xs">
            Post your first job
          </Link>
        </div>
      ) : (
        <ClientJobsList jobs={jobsForClient} quoteCountMap={quoteCountObj} />
      )}
    </div>
  );
}
