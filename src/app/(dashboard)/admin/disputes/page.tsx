import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { disputeRepository } from "@/repositories/dispute.repository";
import { DisputeStatusBadge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import DisputeActions from "./DisputeActions";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import TourGuide from "@/components/shared/TourGuide";
import { PhotoStrip } from "@/components/shared/JobPhotoGallery";
import { AlertOctagon, Search, Lock } from "lucide-react";

export const metadata: Metadata = { title: "Disputes" };

type ActiveDispute = Awaited<ReturnType<typeof disputeRepository.findActiveWithRefs>>[number];

function DisputeCard({ dispute }: { dispute: ActiveDispute }) {
  const escrowAtRisk = dispute.jobId?.escrowStatus === "funded";
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {escrowAtRisk && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-5 py-2 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Escrow funded — {formatCurrency(dispute.jobId!.budget)} at risk
          </p>
        </div>
      )}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{dispute.jobId?.title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Raised by <span className="font-semibold text-slate-600 dark:text-slate-300">{dispute.raisedBy.name}</span>
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${dispute.raisedBy.role === "client" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"}`}>
                {dispute.raisedBy.role}
              </span>
              <span className="ml-2 text-slate-300 dark:text-slate-600">·</span>
              <span className="ml-2">{formatDate(dispute.createdAt)}</span>
            </p>
          </div>
          <DisputeStatusBadge status={dispute.status} />
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4 text-sm text-slate-700 dark:text-slate-200">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Dispute Reason</p>
          {dispute.reason}
        </div>

        {dispute.evidence && dispute.evidence.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Evidence</p>
            <PhotoStrip urls={dispute.evidence} label="" />
          </div>
        )}

        <DisputeActions
          disputeId={String(dispute._id)}
          currentStatus={dispute.status}
          escrowStatus={dispute.jobId?.escrowStatus}
          jobTitle={dispute.jobId?.title}
          reason={dispute.reason}
          raisedByRole={dispute.raisedBy.role}
        />
      </div>
    </div>
  );
}

export default async function AdminDisputesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const disputes = await disputeRepository.findActiveWithRefs();

  const open = disputes.filter((d) => d.status === "open");
  const investigating = disputes.filter((d) => d.status === "investigating");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
          <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Dispute Panel</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{disputes.length} active dispute{disputes.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <TourGuide
        pageKey="admin-disputes"
        title="How Dispute Resolution works"
        steps={[
          { icon: "📝", title: "Review the dispute", description: "Read the client's complaint and the provider's side. View uploaded evidence photos from both parties." },
          { icon: "🔒", title: "Escrow is held", description: "Payment remains in escrow during the dispute — neither party can access it until you decide." },
          { icon: "⚖️", title: "Make a decision", description: "Release payment to the provider if work was completed, or refund the client if the dispute is valid." },
          { icon: "📋", title: "All decisions are logged", description: "Every dispute resolution is recorded in the activity log for audit and accountability purposes." },
        ]}
      />
      <RealtimeRefresher entity="dispute" />

      {disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
            <AlertOctagon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-semibold">No active disputes</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">All disputes have been resolved.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertOctagon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-white">New — Needs Review</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">{open.length}</span>
              </div>
              <div className="space-y-3">
                {open.map((d) => <DisputeCard key={String(d._id)} dispute={d} />)}
              </div>
            </div>
          )}
          {investigating.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Search className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Under Investigation</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">{investigating.length}</span>
              </div>
              <div className="space-y-3">
                {investigating.map((d) => <DisputeCard key={String(d._id)} dispute={d} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
