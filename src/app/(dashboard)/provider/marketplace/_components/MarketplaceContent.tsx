import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import MarketplaceClient from "../MarketplaceClient";
import type { IJob } from "@/types";

export async function MarketplaceContent({ userId }: { userId: string }) {
  await connectDB();

  const [jobsResult, categoryDocs, providerQuotes] = await Promise.all([
    jobRepository.findPaginated({ status: "open" } as never, { limit: 100 }),
    Category.find().sort({ order: 1 }).select("name").lean(),
    quoteRepository.findByProvider(userId),
  ]);

  const initialJobs = JSON.parse(JSON.stringify(jobsResult.data)) as IJob[];
  const initialCategories = ["All", ...(categoryDocs as { name: string }[]).map((c) => c.name)];
  const initialQuotedJobIds = providerQuotes.map((q) => q.jobId.toString());

  return (
    <MarketplaceClient
      initialJobs={initialJobs}
      initialCategories={initialCategories}
      initialQuotedJobIds={initialQuotedJobIds}
    />
  );
}
