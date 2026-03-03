"use client";

import { useState } from "react";
import Link from "next/link";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  MapPin, Calendar, MessageSquare, ShieldCheck, ChevronRight,
  Briefcase, Zap, CheckCircle2,
} from "lucide-react";
import type { IJob, JobStatus } from "@/types";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";

type JobWithProvider = IJob & {
  providerId?: { _id: string; name: string; email: string; isVerified: boolean };
};

interface ClientJobsListProps {
  jobs: JobWithProvider[];
  quoteCountMap: Record<string, number>;
  fundedAmounts?: Record<string, number>;
}

/* ─── Tab definitions ─────────────────────────────────────────── */
const TABS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All",          value: "all" },
  { label: "Pending",      value: "pending_validation" },
  { label: "Open",         value: "open" },
  { label: "Assigned",     value: "assigned" },
  { label: "In Progress",  value: "in_progress" },
  { label: "Completed",    value: "completed" },
  { label: "Disputed",     value: "disputed" },
  { label: "Rejected",     value: "rejected" },
  { label: "Refunded",     value: "refunded" },
  { label: "Expired",      value: "expired" },
];

/* ─── Progress lifecycle ──────────────────────────────────────── */
const LIFECYCLE = ["Posted", "Open", "Assigned", "In Progress", "Done"] as const;

const STATUS_STEP: Record<JobStatus | "all", number> = {
  all: 0,
  pending_validation: 1,
  open: 2,
  assigned: 3,
  in_progress: 4,
  completed: 5,
  disputed: 4,
  rejected: 2,
  refunded: 3,
  expired: 2,
};

/* ─── Left-border accent per status ──────────────────────────── */
const STATUS_BORDER: Record<JobStatus, string> = {
  pending_validation: "border-l-slate-300",
  open:               "border-l-blue-400",
  assigned:           "border-l-violet-400",
  in_progress:        "border-l-amber-400",
  completed:          "border-l-green-400",
  disputed:           "border-l-red-400",
  rejected:           "border-l-slate-300",
  refunded:           "border-l-teal-400",
  expired:            "border-l-slate-300",
};

const STATUS_DOT: Record<JobStatus, string> = {
  pending_validation: "bg-slate-300",
  open:               "bg-blue-400",
  assigned:           "bg-violet-400",
  in_progress:        "bg-amber-400",
  completed:          "bg-green-400",
  disputed:           "bg-red-400",
  rejected:           "bg-slate-300",
  refunded:           "bg-teal-400",
  expired:            "bg-slate-300",
};

/* ─── Friendly empty-tab messages ────────────────────────────── */
const EMPTY_MESSAGES: Partial<Record<JobStatus | "all", string>> = {
  open:       "No open jobs — your open jobs waiting for quotes will show up here.",
  assigned:   "No assigned jobs yet — once you accept a quote, it appears here.",
  in_progress:"No jobs in progress — funded jobs being worked on will show here.",
  completed:  "No completed jobs yet — finished jobs build your review history!",
  disputed:   "No disputes — great news!",
};

/* ─── Component ───────────────────────────────────────────────── */
export default function ClientJobsList({
  jobs,
  quoteCountMap,
  fundedAmounts = {},
}: ClientJobsListProps) {
  const [activeTab, setActiveTab] = useState<JobStatus | "all">("all");

  const filtered =
    activeTab === "all" ? jobs : jobs.filter((j) => j.status === activeTab);

  /* Summary stats */
  const totalActive = jobs.filter(
    (j) => ["open", "assigned", "in_progress"].includes(j.status)
  ).length;
  const totalQuotes = Object.values(quoteCountMap).reduce((a, b) => a + b, 0);
  const totalBudget = jobs
    .filter((j) => j.status !== "rejected" && j.status !== "refunded")
    .reduce((s, j) => s + j.budget, 0);

  return (
    <div className="space-y-4">

      {/* ── Summary stats strip ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">Total</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{jobs.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">Active</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{totalActive}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">Quotes</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{totalQuotes}</p>
          </div>
        </div>
      </div>

      {/* ── Budget info strip ── */}
      {totalBudget > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
          Combined budget across active &amp; completed jobs:
          <span className="font-semibold text-slate-800 ml-1">{formatCurrency(totalBudget)}</span>
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
          {TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? jobs.length
                : jobs.filter((j) => j.status === tab.value).length;
            if (count === 0 && tab.value !== "all") return null;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === tab.value
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Result count ── */}
      {activeTab !== "all" && filtered.length > 0 && (
        <p className="text-xs text-slate-400 px-0.5">
          Showing {filtered.length} {activeTab.replace(/_/g, " ")} job{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <p className="text-slate-500 text-sm font-medium">
            {EMPTY_MESSAGES[activeTab] ?? `No ${activeTab.replace(/_/g, " ")} jobs.`}
          </p>
          {activeTab !== "all" && (
            <button
              onClick={() => setActiveTab("all")}
              className="text-xs text-primary hover:underline"
            >
              View all jobs
            </button>
          )}
        </div>
      ) : (
        /* ── Job cards ── */
        <div className="space-y-3">
          {filtered.map((j) => {
            const pendingQuotes = quoteCountMap[j._id.toString()] ?? 0;
            const fundedAmount = fundedAmounts[j._id.toString()];
            const step = STATUS_STEP[j.status] ?? 1;
            const borderClass = STATUS_BORDER[j.status] ?? "border-l-slate-200";
            const dotClass = STATUS_DOT[j.status] ?? "bg-slate-300";

            return (
              <div
                key={j._id.toString()}
                className={`relative block bg-white rounded-xl border border-slate-200 border-l-4 ${borderClass} shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-4 sm:p-5 group`}
              >
                {/* Overlay link covers the whole card except interactive children */}
                <Link
                  href={`/client/jobs/${j._id}`}
                  className="absolute inset-0 rounded-xl"
                  aria-label={j.title}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                      {j.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                      <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                        {j.category}
                      </span>
                      {j.location && (
                        <span className="hidden sm:flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {j.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(j.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {j.providerId && (
                        <span className="relative z-10 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{j.providerId.name}</span>
                          <ProviderInfoButton
                            providerId={j.providerId._id}
                            providerName={j.providerId.name}
                          />
                        </span>
                      )}
                      {pendingQuotes > 0 && (
                        <span className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <MessageSquare className="h-3 w-3" />
                          {pendingQuotes} quote{pendingQuotes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Budget</p>
                      <p className="text-base sm:text-xl font-bold text-slate-900">{formatCurrency(j.budget)}</p>
                    </div>
                    <JobStatusBadge status={j.status} />
                    <EscrowBadge status={j.escrowStatus} />
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors mt-auto" />
                  </div>
                </div>

                {/* Funded escrow row */}
                {fundedAmount !== undefined && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
                    <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-slate-600">
                      Funded:{" "}
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(fundedAmount)}
                      </span>
                    </span>
                    {fundedAmount !== j.budget && (
                      <span className="text-xs text-slate-400 line-through ml-1">
                        {formatCurrency(j.budget)} budget
                      </span>
                    )}
                  </div>
                )}

                {/* ── Job lifecycle progress bar ── */}
                {!["disputed", "rejected", "refunded"].includes(j.status) && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      {LIFECYCLE.map((label, idx) => {
                        const stageNum = idx + 1;
                        const isDone = step >= stageNum;
                        const isCurrent = step === stageNum;
                        return (
                          <div key={label} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div
                                className={`h-2 w-2 rounded-full transition-colors ${
                                  isDone ? dotClass : "bg-slate-200"
                                } ${isCurrent ? "ring-2 ring-offset-1 ring-current" : ""}`}
                                style={isCurrent ? { color: "transparent" } : undefined}
                              />
                              <span
                                className={`text-[9px] font-medium whitespace-nowrap ${
                                  isCurrent ? "text-slate-700" : isDone ? "text-slate-500" : "text-slate-300"
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                            {idx < LIFECYCLE.length - 1 && (
                              <div
                                className={`h-px flex-1 mx-1 transition-colors ${
                                  step > stageNum ? dotClass : "bg-slate-200"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Side-state label for dispute/reject/refund */}
                {["disputed", "rejected", "refunded"].includes(j.status) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${dotClass}`} />
                    <span className="text-xs text-slate-400 capitalize">
                      {j.status.replace(/_/g, " ")} — contact support if you need assistance.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
