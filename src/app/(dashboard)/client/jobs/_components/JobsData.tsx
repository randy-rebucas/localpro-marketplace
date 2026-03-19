import Link from "next/link";
import { Briefcase } from "lucide-react";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import type { IJob } from "@/types";
import ClientJobsList from "./ClientJobsList";

export async function JobsData({ userId }: { userId: string }) {
  const { data: jobs } = await jobRepository.findAllForClient(userId, { page: 1, limit: 100 });
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
      <div className="bg-white rounded-xl border border-slate-200 p-14 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">No jobs yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs">
            Post your first job and start receiving quotes from verified local providers.
          </p>
        </div>
        <Link href="/client/post-job" className="btn-primary mt-1">
          + Post your first job
        </Link>
      </div>
    );
  }

  return (
    <ClientJobsList
      jobs={jobsForClient}
      quoteCountMap={quoteCountObj}
      fundedAmounts={fundedAmounts}
    />
  );
}
