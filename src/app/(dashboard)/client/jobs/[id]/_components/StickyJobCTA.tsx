"use client";

import dynamic from "next/dynamic";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateClientFees, DEFAULT_ESCROW_FEE_RATE_PERCENT, DEFAULT_PROCESSING_FEE_RATE_PERCENT } from "@/lib/commission";
import type { JobStatus, EscrowStatus } from "@/types";
import { useTranslations } from "next-intl";

const JobActionButtons = dynamic(() => import("./JobActionButtons"), { ssr: false });

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  budget: number;
  acceptedAmount?: number;
  fundedAmount?: number;
  category?: string;
  urgencyFee?: number;
  urgency?: string;
}

/**
 * Sticky bottom bar surfacing the primary job action (fund escrow / release payment).
 * Only renders when there is an actionable CTA for the client.
 */
export default function StickyJobCTA({ jobId, status, escrowStatus, budget, acceptedAmount, fundedAmount, category, urgencyFee, urgency }: Props) {
  const t = useTranslations("clientPages");
  const needsFunding = status === "assigned" && escrowStatus === "not_funded";
  const needsRelease = status === "completed" && escrowStatus === "funded";

  if (!needsFunding && !needsRelease) return null;

  const serviceAmount = acceptedAmount ?? budget;
  const { escrowFee, processingFee, totalCharge } = calculateClientFees(
    serviceAmount,
    DEFAULT_ESCROW_FEE_RATE_PERCENT,
    DEFAULT_PROCESSING_FEE_RATE_PERCENT,
    urgencyFee ?? 0
  );

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            {needsFunding && (
              <>
                <p className="text-sm font-semibold text-slate-900">{t("cta_readyToStart")}</p>
                <p className="text-xs text-slate-500 truncate">
                  {formatCurrency(serviceAmount)} + {formatCurrency(escrowFee)} escrow + {formatCurrency(processingFee)} processing
                  {(urgencyFee ?? 0) > 0 && (
                    <> + {formatCurrency(urgencyFee ?? 0)} {urgency === "rush" ? "rush" : "same-day"}</>
                  )}{" "}
                  = <span className="font-semibold text-slate-700">{formatCurrency(totalCharge)} total</span>
                  {" "}{t("cta_releasedOnApproval")}
                </p>
              </>
            )}
            {needsRelease && (
              <>
                <p className="text-sm font-semibold text-slate-900">{t("cta_jobCompleted")}</p>
                <p className="text-xs text-slate-500 truncate">
                  {t("cta_releaseDesc", { amount: formatCurrency(fundedAmount ?? budget) })}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <JobActionButtons
            jobId={jobId}
            status={status}
            escrowStatus={escrowStatus}
            budget={budget}
            acceptedAmount={acceptedAmount}
            fundedAmount={fundedAmount}
            category={category}
            urgencyFee={urgencyFee}
            urgency={urgency}
          />
        </div>
      </div>
    </div>
  );
}
