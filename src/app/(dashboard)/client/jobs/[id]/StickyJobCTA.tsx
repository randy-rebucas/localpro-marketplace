"use client";

import dynamic from "next/dynamic";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { JobStatus, EscrowStatus } from "@/types";

const JobActionButtons = dynamic(() => import("./JobActionButtons"), { ssr: false });

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  budget: number;
  acceptedAmount?: number;
  fundedAmount?: number;
}

/**
 * Sticky bottom bar surfacing the primary job action (fund escrow / release payment).
 * Only renders when there is an actionable CTA for the client.
 */
export default function StickyJobCTA({ jobId, status, escrowStatus, budget, acceptedAmount, fundedAmount }: Props) {
  const needsFunding = status === "assigned" && escrowStatus === "not_funded";
  const needsRelease = status === "completed" && escrowStatus === "funded";

  if (!needsFunding && !needsRelease) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            {needsFunding && (
              <>
                <p className="text-sm font-semibold text-slate-900">Ready to start?</p>
                <p className="text-xs text-slate-500 truncate">
                  Fund{" "}
                  {formatCurrency(acceptedAmount ?? budget)} in escrow — released only when you approve the work
                </p>
              </>
            )}
            {needsRelease && (
              <>
                <p className="text-sm font-semibold text-slate-900">Job completed</p>
                <p className="text-xs text-slate-500 truncate">
                  Release {formatCurrency(fundedAmount ?? budget)} to the provider when satisfied
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
          />
        </div>
      </div>
    </div>
  );
}
