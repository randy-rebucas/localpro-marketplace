import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { quoteRepository } from "@/repositories/quote.repository";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import MarketplaceClient from "./MarketplaceClient";
import type { IJob } from "@/types";

export const metadata: Metadata = { title: "Marketplace" };


function MarketplaceSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-7 w-32 bg-slate-200 rounded-lg" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
      </div>
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="h-9 w-48 bg-white rounded-lg border border-slate-200" />
        <div className="h-9 w-40 bg-white rounded-lg border border-slate-200" />
      </div>
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-7 w-20 bg-white rounded-full border border-slate-200" />
        ))}
      </div>
      {/* Job cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-52 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
    </div>
  );
}

async function MarketplaceContent({ userId }: { userId: string }) {
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

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Suspense fallback={<MarketplaceSkeleton />}>
      <MarketplaceContent userId={user.userId} />
    </Suspense>
  );
}
