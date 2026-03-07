import { quoteRepository } from "@/repositories/quote.repository";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import Job from "@/models/Job";
import Quote from "@/models/Quote";
import MarketplaceClient from "../MarketplaceClient";
import type { IJob } from "@/types";

export async function MarketplaceContent({ userId, refJobId }: { userId: string; refJobId?: string }) {
  await connectDB();

  const [rawJobs, categoryDocs, providerQuotes] = await Promise.all([
    Job.find({ status: "open" })
      .populate("clientId", "name isVerified avatar")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    Category.find().sort({ order: 1 }).select("name").lean(),
    quoteRepository.findByProvider(userId),
  ]);

  // Count active (non-rejected) quotes per job
  const jobIds = rawJobs.map((j) => j._id);
  const quoteAgg = await Quote.aggregate<{ _id: string; count: number }>([
    { $match: { jobId: { $in: jobIds }, status: { $ne: "rejected" } } },
    { $group: { _id: "$jobId", count: { $sum: 1 } } },
  ]);
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
