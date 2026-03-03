import { jobRepository } from "@/repositories/job.repository";
import { paymentRepository } from "@/repositories/payment.repository";
import Link from "next/link";
import ProviderJobsList from "../ProviderJobsList";
import type { IJob } from "@/types";
import { Briefcase } from "lucide-react";

export async function JobsContent({ userId }: { userId: string }) {
  const jobs = await jobRepository.findActiveJobsForProvider(userId);

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

  // Fetch paid payment amounts keyed by jobId
  const jobIds = serialized.map((j) => j._id.toString());
  const paymentAmounts = await paymentRepository.findAmountsByJobIds(jobIds);
  const fundedMap: Record<string, number> = {};
  for (const [k, v] of paymentAmounts) fundedMap[k] = v;

  // Sort jobs by status: in_progress > assigned > completed > others
  const statusOrder = { in_progress: 0, assigned: 1, completed: 2 };
  serialized.sort((a, b) => {
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
    return aOrder - bOrder;
  });

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-14 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
          <Briefcase className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">No active jobs yet</p>
          <p className="text-xs text-slate-400 mt-1">Accept a quote from the marketplace to get started.</p>
        </div>
        <Link href="/provider/marketplace" className="text-xs font-medium text-primary hover:underline">
          Browse the marketplace →
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-slate-500 text-sm">{jobs.length} job{jobs.length !== 1 ? "s" : ""} assigned to you</p>
      <ProviderJobsList jobs={serialized} fundedAmounts={fundedMap} />
    </>
  );
}
