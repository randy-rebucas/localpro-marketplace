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

interface ProviderConsultationsDataProps {
  userId: string;
}

export function ProviderConsultationsData({
  userId,
}: ProviderConsultationsDataProps) {
  const [consultations, setConsultations] = useState<IConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        setError(null);

        const statusParam = activeTab === "all" ? "" : `&status=${activeTab}`;
        const res = await fetch(`/api/consultations?page=1&limit=50${statusParam}`);

        if (!res.ok) throw new Error("Failed to fetch consultation requests");

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
                <div className="flex items-center gap-2">
                  <div className="h-5 bg-slate-200 rounded w-2/3" />
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
                <div className="flex gap-4 pt-1">
                  <div className="h-3 bg-slate-200 rounded w-28" />
                  <div className="h-3 bg-slate-200 rounded w-20" />
                </div>
              </div>
              <div className="h-9 w-24 bg-slate-200 rounded flex-shrink-0" />
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="w-12 h-12 bg-slate-200 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700 font-medium">Failed to load consultation requests</p>
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
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 text-sm font-medium transition rounded-t-md whitespace-nowrap ${
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
            📋
          </div>
          <div>
            <p className="font-medium text-slate-700">
              {activeTab === "all" ? "No consultation requests" : `No ${activeTab} consultations`}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "pending"
                ? "You have no pending consultation requests right now."
                : `You have no ${activeTab} consultations at this time.`}
            </p>
          </div>
        </div>
      )}

      {/* Consultation List */}
      {consultations.length > 0 && (
        <div className="space-y-2">
          {consultations.map((consultation) => {
            const statusClass = STATUS_BADGE[consultation.status] ?? "bg-slate-100 text-slate-600";
            const statusLabel =
              consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1);

            return (
              <Link
                key={consultation._id?.toString()}
                href={`/provider/consultations/${consultation._id}`}
                className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title & Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {consultation.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {consultation.description}
                    </p>

                    {/* Meta */}
                    <div className="text-xs text-slate-400 flex gap-4 flex-wrap">
                      <span>📍 {consultation.location}</span>
                      <span>
                        {consultation.type === "site_inspection" ? "🏢 Site Inspection" : "💬 Chat"}
                      </span>
                      {consultation.estimateAmount && (
                        <span className="text-emerald-600 font-medium">
                          ₱{consultation.estimateAmount.toLocaleString()} estimate
                        </span>
                      )}
                      <span>{formatDistanceToNow(new Date(consultation.createdAt))} ago</span>
                    </div>

                    {/* Photo thumbnails */}
                    {consultation.photos.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {consultation.photos.slice(0, 3).map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ))}
                        {consultation.photos.length > 3 && (
                          <div className="w-12 h-12 bg-slate-200 rounded border flex items-center justify-center text-xs font-medium text-slate-600">
                            +{consultation.photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="text-right shrink-0">
                    {consultation.status === "pending" ? (
                      <span className="btn-primary text-sm">Respond</span>
                    ) : consultation.estimateAmount ? (
                      <div className="text-sm font-semibold text-blue-600">
                        ₱{consultation.estimateAmount.toLocaleString()}
                      </div>
                    ) : null}
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
