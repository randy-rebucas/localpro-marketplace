import { Clock, ShieldCheck, Zap, CheckCircle2, AlertTriangle, Ban, RefreshCcw } from "lucide-react";
import type { JobStatus, EscrowStatus } from "@/types";

interface Props {
  status: JobStatus;
  escrowStatus: EscrowStatus;
}

type BannerConfig = {
  icon: React.ReactNode;
  title: string;
  body: string;
  className: string;
};

const BANNERS: Partial<Record<JobStatus, BannerConfig>> = {
  pending_validation: {
    icon: <Clock className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />,
    title: "Pending review",
    body: "Your job is being reviewed by our team. It will go live for providers to quote once approved — usually within a few minutes.",
    className: "bg-slate-50 border-slate-200",
  },
  open: {
    icon: <Zap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />,
    title: "Waiting for quotes",
    body: "Your job is live! Verified providers are reviewing it and will send quotes. Check back soon — quotes usually arrive within the hour.",
    className: "bg-blue-50 border-blue-200",
  },
  assigned: {
    icon: <ShieldCheck className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />,
    title: "Provider assigned — fund escrow to begin",
    body: "You've accepted a quote. Fund escrow to officially kick off the job. Your payment is held securely and only released when you approve the completed work.",
    className: "bg-violet-50 border-violet-200",
  },
  in_progress: {
    icon: <Zap className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />,
    title: "Work is underway",
    body: "Your provider is actively working on the job. You'll be notified when they mark the job as complete.",
    className: "bg-amber-50 border-amber-200",
  },
  completed: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />,
    title: "Work completed — release payment when satisfied",
    body: "The provider has marked this job as done. Review the work, then release the escrow payment. If there's an issue, raise a dispute instead.",
    className: "bg-green-50 border-green-200",
  },
  disputed: {
    icon: <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />,
    title: "Dispute in progress",
    body: "A dispute has been raised. Our team is reviewing the case. Expect a resolution within 1–3 business days.",
    className: "bg-red-50 border-red-200",
  },
  rejected: {
    icon: <Ban className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />,
    title: "Job rejected",
    body: "This job was rejected after review. Please contact support if you believe this was an error, or post a new job with updated details.",
    className: "bg-slate-50 border-slate-200",
  },
  refunded: {
    icon: <RefreshCcw className="h-5 w-5 text-teal-500 flex-shrink-0 mt-0.5" />,
    title: "Escrow refunded",
    body: "The escrow funds for this job have been returned to your account. Contact support if you have any questions.",
    className: "bg-teal-50 border-teal-200",
  },
};

export function StatusBanner({ status, escrowStatus }: Props) {
  // Assigned + already funded → override with in_progress-style message
  const key: JobStatus =
    status === "assigned" && escrowStatus === "funded" ? "in_progress" : status;

  const config = BANNERS[key];
  if (!config) return null;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 ${config.className}`}>
      {config.icon}
      <div>
        <p className="text-sm font-semibold text-slate-900">{config.title}</p>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{config.body}</p>
      </div>
    </div>
  );
}
