"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Clock, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "@/lib/dateUtils";
import type { IConsultation } from "@/types";

type TabFilter = "all" | "pending" | "accepted" | "declined" | "converted" | "expired";

const STATUS_BADGE: Record<string, { bg: string; dot: string; label: string }> = {
  pending:   { bg: "bg-yellow-100 text-yellow-800",  dot: "bg-yellow-400",  label: "Pending" },
  accepted:  { bg: "bg-green-100 text-green-800",    dot: "bg-green-500",   label: "Accepted" },
  declined:  { bg: "bg-red-100 text-red-800",        dot: "bg-red-400",     label: "Declined" },
  converted: { bg: "bg-blue-100 text-blue-800",      dot: "bg-blue-500",   label: "Converted" },
  expired:   { bg: "bg-slate-100 text-slate-600",    dot: "bg-slate-400",  label: "Expired" },
};

const TYPE_BADGE: Record<string, string> = {
  site_inspection: "bg-violet-100 text-violet-700",
  chat:            "bg-sky-100 text-sky-700",
};

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "accepted",  label: "Accepted" },
  { key: "declined",  label: "Declined" },
  { key: "converted", label: "Converted" },
  { key: "expired",   label: "Expired" },
];

interface ConsultationsDataProps {
  userId: string;
}

export function ConsultationsData({ userId }: ConsultationsDataProps) {
  const [consultations, setConsultations] = useState<IConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        setError(null);
        const statusParam = activeTab === "all" ? "" : `&status=${activeTab}`;
        const res = await fetch(`/api/consultations?page=1&limit=50${statusParam}`);
        if (!res.ok) throw new Error("Failed to fetch consultations");
        const data = await res.json();
        setConsultations(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchConsultations();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Tab skeleton */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b">
          {TABS.map((t) => (
            <div key={t.key} className="h-8 w-20 flex-shrink-0 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-pulse">
            <div className="flex justify-between gap-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-5 w-16 bg-slate-200 rounded-full flex-shrink-0" />
            </div>
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="flex gap-3">
              <div className="h-3 bg-slate-200 rounded w-28" />
              <div className="h-3 bg-slate-200 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700 font-medium">Failed to load consultations</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={() => setActiveTab(activeTab)}
          className="mt-3 text-sm text-red-700 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs — horizontally scrollable on mobile */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200 -mx-1 px-1 gap-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 py-2 px-3 sm:px-4 text-sm font-medium transition whitespace-nowrap rounded-t-md ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {consultations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
            🔍
          </div>
          <div>
            <p className="font-medium text-slate-700">
              {activeTab === "all" ? "No consultations yet" : `No ${activeTab} consultations`}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "all"
                ? "Start by requesting a consultation from a provider."
                : `You have no ${activeTab} consultations at this time.`}
            </p>
          </div>
          {activeTab === "all" && (
            <Link href="/client/consultations/request" className="btn-primary mt-1">
              + Request Consultation
            </Link>
          )}
        </div>
      )}

      {/* Consultation list */}
      {consultations.length > 0 && (
        <div className="space-y-2">
          {consultations.map((c) => {
            const badge = STATUS_BADGE[c.status] ?? { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400", label: c.status };
            const typeCls = TYPE_BADGE[c.type] ?? "bg-slate-100 text-slate-600";
            const typeLabel = c.type === "site_inspection" ? "Site Inspection" : "Chat";

            return (
              <Link
                key={c._id?.toString()}
                href={`/client/consultations/${c._id}`}
                className="group flex items-stretch gap-0 bg-white border border-slate-200 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
              >
                {/* Left status strip */}
                <div className={`w-1 flex-shrink-0 ${badge.dot}`} />

                <div className="flex-1 min-w-0 p-3.5 sm:p-4">
                  {/* Row 1: title + status */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {c.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Row 2: description preview */}
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                    {c.description}
                  </p>

                  {/* Row 3: meta chips */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${typeCls}`}>
                      {typeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[140px] sm:max-w-none">{c.location}</span>
                    </span>
                    {c.estimateAmount != null && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <DollarSign className="h-3 w-3" />
                        ₱{c.estimateAmount.toLocaleString()} est.
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(c.createdAt))} ago
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <div className="flex items-center pr-3 text-slate-300 group-hover:text-primary transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
