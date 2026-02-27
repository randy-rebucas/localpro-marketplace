"use client";

import { useState } from "react";
import Link from "next/link";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MapPin, Calendar, MessageSquare } from "lucide-react";
import type { IJob, JobStatus } from "@/types";
import ProviderInfoButton from "@/components/shared/ProviderInfoButton";

type JobWithProvider = IJob & { providerId?: { _id: string; name: string; email: string; isVerified: boolean } };

interface ClientJobsListProps {
  jobs: JobWithProvider[];
  quoteCountMap: Record<string, number>;
}

const TABS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export default function ClientJobsList({ jobs, quoteCountMap }: ClientJobsListProps) {
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

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No {activeTab === "all" ? "" : activeTab.replace("_", " ")} jobs.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((j) => {
            const pendingQuotes = quoteCountMap[j._id.toString()] ?? 0;
            return (
              <div
                key={j._id.toString()}
                className="relative block bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-5"
              >
                {/* Overlay link covers the whole card except interactive children */}
                <Link href={`/client/jobs/${j._id}`} className="absolute inset-0 rounded-xl" aria-label={j.title} />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <h3 className="font-semibold text-slate-900 truncate">{j.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">{j.category}</span>
                      {j.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{j.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />Posted {formatDate(j.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {j.providerId && (
                        <span className="relative z-10 flex items-center gap-2 text-xs text-slate-500">
                          Provider: <span className="font-medium text-slate-700">{j.providerId.name}</span>
                          <ProviderInfoButton
                            providerId={j.providerId._id}
                            providerName={j.providerId.name}
                          />
                        </span>
                      )}
                      {pendingQuotes > 0 && (
                        <span className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <MessageSquare className="h-3 w-3" />
                          {pendingQuotes} new quote{pendingQuotes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xl font-bold text-slate-900">{formatCurrency(j.budget)}</span>
                    <JobStatusBadge status={j.status} />
                    <EscrowBadge status={j.escrowStatus} />
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
