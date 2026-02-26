import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { IJob } from "@/types";

export default async function EscrowPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const jobs = await Job.find({
    clientId: user.userId,
    status: { $in: ["assigned", "in_progress", "completed"] },
  })
    .populate("providerId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const totalLocked = jobs
    .filter((j) => j.escrowStatus === "funded")
    .reduce((sum, j) => sum + j.budget, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Escrow</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage escrow payments for your jobs.
          Total locked: <span className="font-semibold text-slate-700">{formatCurrency(totalLocked)}</span>
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No jobs requiring escrow action.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const j = job as unknown as IJob & { providerId?: { name: string } };
            return (
              <div key={j._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/client/jobs/${j._id}`} className="font-semibold text-slate-900 hover:text-primary text-sm">
                      {j.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-1">
                      Provider: {j.providerId?.name ?? "—"} · Scheduled {formatDate(j.scheduleDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-slate-900">{formatCurrency(j.budget)}</p>
                    <EscrowBadge status={j.escrowStatus} />
                    {j.status === "assigned" && j.escrowStatus === "not_funded" && (
                      <Link href={`/client/jobs/${j._id}`} className="btn-primary text-xs py-1.5 px-3">
                        Fund Escrow →
                      </Link>
                    )}
                    {j.status === "completed" && j.escrowStatus === "funded" && (
                      <Link href={`/client/jobs/${j._id}`} className="btn-primary text-xs py-1.5 px-3 bg-green-600 hover:bg-green-700">
                        Release Payment →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
