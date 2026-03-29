import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { categoryRepository } from "@/repositories/category.repository";
import MarketplaceClient from "../MarketplaceClient";
import type { IJob } from "@/types";

export async function MarketplaceContent({ userId, refJobId }: { userId: string; refJobId?: string }) {
  const [rawJobs, categoryDocs, providerQuotes] = await Promise.all([
    jobRepository.findOpenForMarketplace(100),
    categoryRepository.findAll(),
    quoteRepository.findByProvider(userId),
  ]);

  // Count active (non-rejected) quotes per job
  const jobIds = rawJobs.map((j) => j._id);
  const quoteAgg = await quoteRepository.countNonRejectedByJobIds(jobIds);
  const quoteCounts: Record<string, number> = {};
  quoteAgg.forEach((q) => { quoteCounts[q._id.toString()] = q.count; });

  const initialJobs = JSON.parse(JSON.stringify(rawJobs)) as IJob[];
  const initialCategories = ["All", ...(categoryDocs as { name: string }[]).map((c) => c.name)];
  const initialQuotedJobStatuses: Record<string, string> = {};
  providerQuotes.forEach((q) => {
    initialQuotedJobStatuses[q.jobId.toString()] = q.status;
  });

  return (
    <MarketplaceClient
      initialJobs={initialJobs}
      initialCategories={initialCategories}
      initialQuotedJobStatuses={initialQuotedJobStatuses}
      quoteCounts={quoteCounts}
      refJobId={refJobId}
    />
  );
}
