import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Dispute from "@/models/Dispute";
import { DisputeStatusBadge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import DisputeActions from "./DisputeActions";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import type { IDispute, IJob } from "@/types";

export default async function AdminDisputesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const disputes = await Dispute.find({
    status: { $in: ["open", "investigating"] },
  })
    .sort({ createdAt: -1 })
    .populate("jobId", "title budget escrowStatus")
    .populate("raisedBy", "name email role")
    .lean() as unknown as (IDispute & {
      jobId: { _id: string; title: string; budget: number; escrowStatus: string };
      raisedBy: { name: string; email: string; role: string };
    })[];

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="dispute" />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dispute Panel</h2>
        <p className="text-slate-500 text-sm mt-0.5">{disputes.length} active dispute{disputes.length !== 1 ? "s" : ""}</p>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No active disputes. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div key={dispute._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{dispute.jobId?.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Raised by: {dispute.raisedBy.name} ({dispute.raisedBy.role}) · {formatDate(dispute.createdAt)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Job budget: {formatCurrency(dispute.jobId?.budget ?? 0)} · Escrow: {dispute.jobId?.escrowStatus}
                  </p>
                </div>
                <DisputeStatusBadge status={dispute.status} />
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-slate-500 mb-1">Reason:</p>
                <p className="text-sm text-slate-700">{dispute.reason}</p>
              </div>

              <DisputeActions
                disputeId={dispute._id.toString()}
                currentStatus={dispute.status}
                escrowStatus={dispute.jobId?.escrowStatus}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
