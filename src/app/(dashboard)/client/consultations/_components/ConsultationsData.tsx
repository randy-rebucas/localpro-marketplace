"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/dateUtils";
import type { IConsultation } from "@/types";

type TabFilter = "all" | "pending" | "accepted" | "declined" | "converted" | "expired";

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  accepted:  "bg-green-100 text-green-800",
  declined:  "bg-red-100 text-red-800",
  converted: "bg-blue-100 text-blue-800",
  expired:   "bg-slate-100 text-slate-600",
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
        <div className="flex gap-1 border-b pb-1">
          {TABS.map((t) => (
            <div key={t.key} className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-full" />
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded flex-shrink-0" />
            </div>
            <div className="flex gap-4">
              <div className="h-3 bg-slate-200 rounded w-32" />
              <div className="h-3 bg-slate-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
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
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 text-sm font-medium transition rounded-t-md ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {consultations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
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

      {/* Consultation List */}
      {consultations.length > 0 && (
        <div className="space-y-2">
          {consultations.map((consultation) => {
            const desc = consultation.description;
            const preview = desc.length > 80 ? desc.substring(0, 80) + "…" : desc;
            const statusClass = STATUS_BADGE[consultation.status] ?? "bg-slate-100 text-slate-600";
            const statusLabel =
              consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1);

            return (
              <Link
                key={consultation._id?.toString()}
                href={`/client/consultations/${consultation._id}`}
                className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {consultation.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{preview}</p>
                    <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-3">
                      <span className="flex items-center gap-1">
                        <span>📍</span> {consultation.location}
                      </span>
                      {consultation.estimateAmount && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <span>₱</span>{consultation.estimateAmount.toLocaleString()} estimate
                        </span>
                      )}
                      <span>{formatDistanceToNow(new Date(consultation.createdAt))} ago</span>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                      consultation.type === "site_inspection"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-sky-100 text-sky-700"
                    }`}>
                      {consultation.type === "site_inspection" ? "Site Inspection" : "Chat"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
