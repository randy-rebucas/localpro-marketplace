import { Clock, ShieldCheck, Zap, CheckCircle2, AlertTriangle, Ban, RefreshCcw } from "lucide-react";
import type { JobStatus, EscrowStatus } from "@/types";
import { getTranslations } from "next-intl/server";

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

export async function StatusBanner({ status, escrowStatus }: Props) {
  const t = await getTranslations("clientPages");

  const BANNERS: Partial<Record<JobStatus, BannerConfig>> = {
    pending_validation: {
      icon: <Clock className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />,
      title: t("banner_pendingTitle"),
      body: t("banner_pendingBody"),
      className: "bg-slate-50 border-slate-200",
    },
    open: {
      icon: <Zap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />,
      title: t("banner_openTitle"),
      body: t("banner_openBody"),
      className: "bg-blue-50 border-blue-200",
    },
    assigned: {
      icon: <ShieldCheck className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />,
      title: t("banner_assignedTitle"),
      body: t("banner_assignedBody"),
      className: "bg-violet-50 border-violet-200",
    },
    in_progress: {
      icon: <Zap className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />,
      title: t("banner_inProgressTitle"),
      body: t("banner_inProgressBody"),
      className: "bg-amber-50 border-amber-200",
    },
    completed: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />,
      title: t("banner_completedTitle"),
      body: t("banner_completedBody"),
      className: "bg-green-50 border-green-200",
    },
    disputed: {
      icon: <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />,
      title: t("banner_disputedTitle"),
      body: t("banner_disputedBody"),
      className: "bg-red-50 border-red-200",
    },
    rejected: {
      icon: <Ban className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />,
      title: t("banner_rejectedTitle"),
      body: t("banner_rejectedBody"),
      className: "bg-slate-50 border-slate-200",
    },
    cancelled: {
      icon: <Ban className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />,
      title: t("banner_cancelledTitle"),
      body: t("banner_cancelledBody"),
      className: "bg-slate-50 border-slate-200",
    },
    refunded: {
      icon: <RefreshCcw className="h-5 w-5 text-teal-500 flex-shrink-0 mt-0.5" />,
      title: t("banner_refundedTitle"),
      body: t("banner_refundedBody"),
      className: "bg-teal-50 border-teal-200",
    },
  };

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
