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
    <div className="flex gap-6 items-start animate-pulse">
      {/* Left sidebar */}
      <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="h-4 w-16 rounded bg-slate-200" />
          <div className="h-9 rounded-lg bg-slate-100" />
          <div className="space-y-2">
            <div className="h-3 w-12 rounded bg-slate-100" />
            <div className="h-9 rounded-lg bg-slate-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="flex gap-2">
              <div className="h-9 flex-1 rounded-lg bg-slate-100" />
              <div className="h-9 flex-1 rounded-lg bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 w-16 bg-slate-100 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Right content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-4/5 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
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
    <div className="space-y-6">
      {/* Header — no data dependency */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketplace</h2>
          <p className="text-slate-500 text-sm mt-1">Browse open jobs and submit competitive quotes.</p>
        </div>
      </div>

      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
