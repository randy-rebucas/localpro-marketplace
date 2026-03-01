"use client";

import { useState } from "react";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import ProviderJobActions from "./ProviderJobActions";
import RaiseDisputeButton from "@/components/shared/RaiseDisputeButton";
import { MapPin, Calendar, User, AlertTriangle, ShieldCheck } from "lucide-react";
import type { IJob, JobStatus, EscrowStatus } from "@/types";

type JobWithClient = IJob & {
  clientId: { name: string };
  beforePhoto?: string[];
  afterPhoto?: string[];
};

interface Props {
  jobs: JobWithClient[];
  fundedAmounts?: Record<string, number>;
}

const TABS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Disputed", value: "disputed" },
  { label: "Completed", value: "completed" },
];

export default function ProviderJobsList({ jobs, fundedAmounts = {} }: Props) {
  const [activeTab, setActiveTab] = useState<JobStatus | "all">("all");

  const filtered = activeTab === "all" ? jobs : jobs.filter((j) => j.status === activeTab);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => {
          const count = tab.value === "all"
            ? jobs.length
            : jobs.filter((j) => j.status === tab.value).length;
          if (count === 0 && tab.value !== "all") return null;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === tab.value ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No {activeTab === "all" ? "" : activeTab.replace("_", " ")} jobs.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((j) => {
            const escrowNotFunded = j.status !== "completed" && j.status !== "disputed" && j.escrowStatus !== "funded";
            const fundedGross = fundedAmounts[j._id.toString()];
            const fundedNet = fundedGross !== undefined ? calculateCommission(fundedGross).netAmount : undefined;
            return (
              <div key={j._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
                {/* Escrow warning strip */}
                {escrowNotFunded && (
                  <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">Awaiting client to fund escrow before you can start</p>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-semibold text-slate-900">{j.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">{j.category}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />Client: {j.clientId.name}</span>
                        {j.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(j.scheduleDate)}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{j.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Budget</p>
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(j.budget)}</p>
                      </div>
                      <JobStatusBadge status={j.status} />
                      <EscrowBadge status={j.escrowStatus as EscrowStatus} />
                    </div>
                  </div>

                  {/* Funded amount row */}
                  {fundedGross !== undefined && fundedNet !== undefined && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 flex-1 text-sm">
                        <span className="text-slate-600">
                          Funded: <span className="font-semibold text-slate-900">{formatCurrency(fundedGross)}</span>
                        </span>
                        <span className="text-emerald-700 font-medium">
                          You receive: {formatCurrency(fundedNet)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4">
                    <ProviderJobActions
                      jobId={j._id.toString()}
                      status={j.status}
                      escrowStatus={j.escrowStatus as EscrowStatus}
                      beforePhoto={j.beforePhoto}
                      afterPhoto={j.afterPhoto}
                    />
                    <RaiseDisputeButton jobId={j._id.toString()} status={j.status} />
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
