import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { disputeRepository } from "@/repositories/dispute.repository";
import { DisputeStatusBadge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import DisputeActions from "./DisputeActions";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import { AlertOctagon, Search, Lock } from "lucide-react";

export const metadata: Metadata = { title: "Disputes" };


export default async function AdminDisputesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const disputes = await disputeRepository.findActiveWithRefs();

  return (
    <div className="space-y-6">
      <RealtimeRefresher entity="dispute" />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dispute Panel</h2>
        <p className="text-slate-500 text-sm mt-0.5">{disputes.length} active dispute{disputes.length !== 1 ? "s" : ""}</p>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No active disputes.</p>
          <p className="text-slate-300 text-xs mt-1">All disputes have been resolved.</p>
        </div>
      ) : (() => {
        const open = disputes.filter((d) => d.status === "open");
        const investigating = disputes.filter((d) => d.status === "investigating");

        function DisputeCard({ dispute }: { dispute: typeof disputes[0] }) {
          const escrowAtRisk = dispute.jobId?.escrowStatus === "funded";
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              {escrowAtRisk && (
                <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-700">
                    Escrow funded — {formatCurrency(dispute.jobId!.budget)} at risk
                  </p>
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{dispute.jobId?.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Raised by <span className="font-medium text-slate-600">{dispute.raisedBy.name}</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${dispute.raisedBy.role === "client" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                        {dispute.raisedBy.role}
                      </span>
                      <span className="ml-2 text-slate-300">·</span>
                      <span className="ml-2">{formatDate(dispute.createdAt)}</span>
                    </p>
                  </div>
                  <DisputeStatusBadge status={dispute.status} />
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm text-slate-700">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Dispute Reason</p>
                  {dispute.reason}
                </div>

                <DisputeActions
                  disputeId={String(dispute._id)}
                  currentStatus={dispute.status}
                  escrowStatus={dispute.jobId?.escrowStatus}
                />
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {open.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-slate-700">New — Needs Review</h3>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{open.length}</span>
                </div>
                <div className="space-y-3">
                  {open.map((d) => <DisputeCard key={String(d._id)} dispute={d} />)}
                </div>
              </div>
            )}
            {investigating.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Under Investigation</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{investigating.length}</span>
                </div>
                <div className="space-y-3">
                  {investigating.map((d) => <DisputeCard key={String(d._id)} dispute={d} />)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
