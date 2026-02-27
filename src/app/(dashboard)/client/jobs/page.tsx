import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Quote from "@/models/Quote";
import Link from "next/link";
import type { IJob } from "@/types";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ClientJobsList from "./ClientJobsList";

async function getClientJobs(clientId: string) {
  await connectDB();
  const jobs = await Job.find({ clientId })
    .sort({ createdAt: -1 })
    .populate("providerId", "name")
    .lean();

  const jobIds = jobs.map((j) => (j as unknown as IJob)._id);
  const quoteCounts = await Quote.aggregate([
    { $match: { jobId: { $in: jobIds }, status: "pending" } },
    { $group: { _id: "$jobId", count: { $sum: 1 } } },
  ]) as { _id: unknown; count: number }[];

  const quoteCountMap = new Map(quoteCounts.map((q) => [String(q._id), q.count]));
  return { jobs, quoteCountMap };
}

export default async function ClientJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { jobs, quoteCountMap } = await getClientJobs(user.userId);

  // Serialize for client component (ObjectIds → strings, Dates → ISO strings)
  const jobsForClient = JSON.parse(JSON.stringify(jobs)) as (IJob & { providerId?: { name: string } })[];
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
