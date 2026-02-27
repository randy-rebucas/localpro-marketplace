import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Link from "next/link";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ProviderJobsList from "./ProviderJobsList";
import type { IJob } from "@/types";

export const metadata: Metadata = { title: "My Jobs" };


export default async function ProviderJobsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const jobs = await Job.find({
    providerId: user.userId,
    status: { $in: ["assigned", "in_progress", "completed"] },
  })
    .populate("clientId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const serialized = JSON.parse(JSON.stringify(jobs)) as (IJob & {
    clientId: { name: string };
    beforePhoto: string[];
    afterPhoto: string[];
  })[];

  // Normalize legacy docs where the field may be a string instead of an array
  for (const j of serialized) {
    if (!Array.isArray(j.beforePhoto)) j.beforePhoto = j.beforePhoto ? [j.beforePhoto as unknown as string] : [];
    if (!Array.isArray(j.afterPhoto))  j.afterPhoto  = j.afterPhoto  ? [j.afterPhoto  as unknown as string] : [];
  }

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="job" />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Active Jobs</h2>
        <p className="text-slate-500 text-sm mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No active jobs.{" "}
          <Link href="/provider/marketplace" className="text-primary hover:underline">Browse the marketplace.</Link>
        </div>
      ) : (
        <ProviderJobsList jobs={serialized} />
      )}
    </div>
  );
}
