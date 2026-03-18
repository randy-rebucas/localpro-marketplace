"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  MapPin, Calendar, MessageSquare, ShieldCheck, ChevronRight,
  Briefcase, Zap, CheckCircle2, Search, X, ArrowUpDown,
  ChevronDown, ChevronUp, Clock, FileText, AlertCircle,
} from "lucide-react";
import type { IJob, JobStatus } from "@/types";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";
import { useTranslations } from "next-intl";

type JobWithProvider = IJob & {
  providerId?: { _id: string; name: string; email: string; isVerified: boolean };
};

type SortOption = "date_desc" | "date_asc" | "budget_high" | "budget_low";

interface ClientJobsListProps {
  jobs: JobWithProvider[];
  quoteCountMap: Record<string, number>;
  fundedAmounts?: Record<string, number>;
}

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
  cancelled:          "border-l-slate-300",
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
  cancelled:          "bg-slate-300",
};

/* ─── Component ───────────────────────────────────────────────── */
export default function ClientJobsList({
  jobs,
  quoteCountMap,
  fundedAmounts = {},
}: ClientJobsListProps) {
  const t = useTranslations("clientPages");
  const [activeTab,   setActiveTab]   = useState<JobStatus | "all">("all");
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState<SortOption>("date_desc");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [listKey,     setListKey]     = useState(0);

  const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: t("jobsList_sortNewest"),     value: "date_desc" },
    { label: t("jobsList_sortOldest"),     value: "date_asc" },
    { label: t("jobsList_sortBudgetHigh"), value: "budget_high" },
    { label: t("jobsList_sortBudgetLow"),  value: "budget_low" },
  ];

  const TABS: { label: string; value: JobStatus | "all" }[] = [
    { label: t("jobsList_tabAll"),        value: "all" },
    { label: t("jobsList_tabPending"),    value: "pending_validation" },
    { label: t("jobsList_tabOpen"),       value: "open" },
    { label: t("jobsList_tabAssigned"),   value: "assigned" },
    { label: t("jobsList_tabInProgress"), value: "in_progress" },
    { label: t("jobsList_tabCompleted"),  value: "completed" },
    { label: t("jobsList_tabDisputed"),   value: "disputed" },
    { label: t("jobsList_tabRejected"),   value: "rejected" },
    { label: t("jobsList_tabRefunded"),   value: "refunded" },
    { label: t("jobsList_tabExpired"),    value: "expired" },
    { label: t("jobsList_tabCancelled"),  value: "cancelled" },
  ];

  const LIFECYCLE = [
    t("jobsList_lcPosted"),
    t("jobsList_lcOpen"),
    t("jobsList_lcAssigned"),
    t("jobsList_lcInProgress"),
    t("jobsList_lcDone"),
  ] as const;

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
    cancelled: 0,
  };

  const EMPTY_MESSAGES: Partial<Record<JobStatus | "all", string>> = {
    open:       t("jobsList_emptyOpen"),
    assigned:   t("jobsList_emptyAssigned"),
    in_progress: t("jobsList_emptyInProgress"),
    completed:  t("jobsList_emptyCompleted"),
    disputed:   t("jobsList_emptyDisputed"),
  };

  const switchTab = useCallback((tab: JobStatus | "all") => {
    setActiveTab(tab);
    setListKey((k) => k + 1);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ── Memoised stats ── */
  const totalActive = useMemo(
    () => jobs.filter((j) => ["open", "assigned", "in_progress"].includes(j.status)).length,
    [jobs]
  );
  const totalQuotes = useMemo(
    () => Object.values(quoteCountMap).reduce((a, b) => a + b, 0),
    [quoteCountMap]
  );
  const totalBudget = useMemo(
    () => jobs
      .filter((j) => j.status !== "rejected" && j.status !== "refunded")
      .reduce((s, j) => s + j.budget, 0),
    [jobs]
  );

  /* ── Memoised filtered + sorted list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = activeTab === "all" ? jobs : jobs.filter((j) => j.status === activeTab);
    if (q) list = list.filter(
      (j) => j.title.toLowerCase().includes(q) || j.category.toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "budget_high": return b.budget - a.budget;
        case "budget_low":  return a.budget - b.budget;
        default:           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [jobs, activeTab, search, sortBy]);

  return (
    <div className="space-y-4">

      {/* ── Summary stats strip ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">{t("jobsList_statTotal")}</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{jobs.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">{t("jobsList_activeLabel")}</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{totalActive}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">{t("jobsList_quotesLabel")}</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{totalQuotes}</p>
          </div>
        </div>
      </div>

      {/* ── Budget info strip ── */}
      {totalBudget > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
          {t("jobsList_combinedBudget")}
          <span className="font-semibold text-slate-800 ml-1">{formatCurrency(totalBudget)}</span>
        </div>
      )}

      {/* ── Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setListKey((k) => k + 1); }}
            placeholder={t("jobsList_searchPlaceholder")}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setListKey((k) => k + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 flex-shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 ml-1 flex-shrink-0" />
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSortBy(opt.value); setListKey((k) => k + 1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                sortBy === opt.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
                onClick={() => switchTab(tab.value)}
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
      {filtered.length > 0 && (activeTab !== "all" || search) && (
        <p className="text-xs text-slate-400 px-0.5">
          {search
            ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search}"`
            : `Showing ${filtered.length} ${activeTab.replace(/_/g, " ")} job${filtered.length !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <p className="text-slate-500 text-sm font-medium">
            {activeTab === "all" && !search
              ? t("jobsList_noJobsYet")
              : (EMPTY_MESSAGES[activeTab] ?? t("jobsList_noMatchFilter"))}
          </p>
          {activeTab !== "all" && (
            <button
              onClick={() => switchTab("all")}
              className="text-xs text-primary hover:underline"
            >
              {t("jobsList_viewAllJobs")}
            </button>
          )}
        </div>
      ) : (
        /* ── Job cards ── */
        <div key={listKey} className="space-y-3 animate-fade-in">
          {filtered.map((j) => {
            const id = j._id.toString();
            const pendingQuotes = quoteCountMap[id] ?? 0;
            const fundedAmount = fundedAmounts[id];
            const step = STATUS_STEP[j.status] ?? 1;
            const borderClass = STATUS_BORDER[j.status] ?? "border-l-slate-200";
            const dotClass = STATUS_DOT[j.status] ?? "bg-slate-300";
            const isExpanded = expandedIds.has(id);

            return (
              <div
                key={id}
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
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px] sm:max-w-none">{j.location}</span>
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
                          {pendingQuotes === 1 ? t("jobsList_quoteLabel", { n: pendingQuotes }) : t("jobsList_quotesPlural", { n: pendingQuotes })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">{t("jobsList_budgetLabel")}</p>
                      <p className="text-base sm:text-xl font-bold text-slate-900">{formatCurrency(j.budget)}</p>
                    </div>
                    <JobStatusBadge status={j.status} />
                    <EscrowBadge status={j.escrowStatus} />
                    <div className="flex flex-col items-center gap-1">
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                      <button
                        onClick={(e) => { e.preventDefault(); toggleExpand(id); }}
                        className="relative z-10 p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Expandable details ── */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fade-in">
                    {j.description && (
                      <div className="flex gap-2 text-xs text-slate-600">
                        <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed line-clamp-3">{j.description}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {j.scheduleDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {t("jobsList_scheduled")} {formatDate(j.scheduleDate)}
                        </span>
                      )}
                      {j.urgency && j.urgency !== "standard" && (
                        <span className={`flex items-center gap-1 font-medium ${
                          j.urgency === "rush" ? "text-red-500" : "text-amber-500"
                        }`}>
                          <Zap className="h-3 w-3" />
                          {j.urgency === "rush" ? t("jobsList_rushBooking") : t("jobsList_samedayBooking")}
                        </span>
                      )}
                      {j.specialInstructions && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-slate-400" />
                          {j.specialInstructions}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Funded escrow row */}
                {fundedAmount !== undefined && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
                    <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-slate-600">
                      {t("jobsList_fundedLabel")}{" "}
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(fundedAmount)}
                      </span>
                    </span>
                    {fundedAmount !== j.budget && (
                      <span className="text-xs text-slate-400 line-through ml-1">
                        {t("jobsList_budgetSuffix", { amount: formatCurrency(j.budget) })}
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
                      {j.status.replace(/_/g, " ")} — {t("jobsList_contactSupport")}
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
