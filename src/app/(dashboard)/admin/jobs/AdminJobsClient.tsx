"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminJobActions from "./AdminJobActions";
import {
  MapPin, Calendar, User, ChevronRight,
  Search, AlertTriangle, ArrowUpDown, SlidersHorizontal,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SerializedJob {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget: number;
  scheduleDate: string;
  riskScore: number;
  fraudFlags?: string[];
  recurringScheduleId?: string | null;
  createdAt: string;
  clientName: string;
  clientEmail: string;
}

type SortKey = "risk_desc" | "risk_asc" | "newest" | "oldest" | "budget_desc";
type RiskFilter = "all" | "high" | "med" | "low";

const SORT_LABELS: Record<SortKey, string> = {
  risk_desc:   "Risk ↓",
  risk_asc:    "Risk ↑",
  newest:      "Newest",
  oldest:      "Oldest",
  budget_desc: "Budget ↓",
};

// ─── Risk helpers ────────────────────────────────────────────────────────────

function riskLevel(score: number): RiskFilter {
  if (score > 60) return "high";
  if (score > 30) return "med";
  return "low";
}

function RiskBadge({ score }: { score: number }) {
  const level = riskLevel(score);
  if (level === "high") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />High Risk · {score}
    </span>
  );
  if (level === "med") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Med Risk · {score}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Low Risk · {score}
    </span>
  );
}

function riskStrip(score: number) {
  if (score > 60) return "bg-red-400";
  if (score > 30) return "bg-amber-400";
  return "bg-green-400";
}

// ─── Job card ────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: SerializedJob }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className={`h-1 w-full ${riskStrip(job.riskScore)}`} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/admin/jobs/${job.id}`}
              className="font-semibold text-slate-900 hover:text-primary transition-colors"
            >
              {job.title}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
              <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">{job.category}</span>
              {job.recurringScheduleId && (
                <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 rounded px-2 py-0.5 font-medium">
                  🔁 Recurring
                </span>
              )}
              {job.fraudFlags && job.fraudFlags.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 rounded px-2 py-0.5 font-medium">
                  <AlertTriangle className="h-3 w-3" />{job.fraudFlags.length} flag{job.fraudFlags.length !== 1 ? "s" : ""}
                </span>
              )}
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{job.clientName}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Submitted {formatDate(job.createdAt)}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 space-y-1.5">
            <p className="text-xl font-bold text-slate-900">{formatCurrency(job.budget)}</p>
            <p className="text-xs text-slate-400">Scheduled {formatDate(job.scheduleDate)}</p>
            <RiskBadge score={job.riskScore} />
          </div>
        </div>

        {/* Fraud flags detail */}
        {job.fraudFlags && job.fraudFlags.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3 flex flex-wrap gap-1.5">
            {job.fraudFlags.map((flag) => (
              <span key={flag} className="text-[11px] font-medium bg-red-100 text-red-700 rounded px-2 py-0.5">{flag}</span>
            ))}
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm text-slate-700 line-clamp-3">
          {job.description}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <AdminJobActions jobId={job.id} riskScore={job.riskScore} />
          </div>
          <Link
            href={`/admin/jobs/${job.id}`}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors whitespace-nowrap"
          >
            Full details <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ───────────────────────────────────────────────────

export default function AdminJobsClient({ jobs }: { jobs: SerializedJob[] }) {
  const [query, setQuery]       = useState("");
  const [sort, setSort]         = useState<SortKey>("risk_desc");
  const [riskFilter, setRisk]   = useState<RiskFilter>("all");

  // Counts per risk bucket
  const counts = useMemo(() => ({
    high: jobs.filter((j) => riskLevel(j.riskScore) === "high").length,
    med:  jobs.filter((j) => riskLevel(j.riskScore) === "med").length,
    low:  jobs.filter((j) => riskLevel(j.riskScore) === "low").length,
  }), [jobs]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return jobs
      .filter((j) => {
        if (riskFilter !== "all" && riskLevel(j.riskScore) !== riskFilter) return false;
        if (q && !j.title.toLowerCase().includes(q) && !j.clientName.toLowerCase().includes(q) && !j.clientEmail.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "risk_desc":   return b.riskScore - a.riskScore;
          case "risk_asc":    return a.riskScore - b.riskScore;
          case "newest":      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "budget_desc": return b.budget - a.budget;
          default:            return 0;
        }
      });
  }, [jobs, query, riskFilter, sort]);

  const RISK_TABS: { key: RiskFilter; label: string; count: number; cls: string }[] = [
    { key: "all",  label: "All",    count: jobs.length,   cls: "bg-slate-100 text-slate-700" },
    { key: "high", label: "High",   count: counts.high,   cls: "bg-red-100 text-red-700" },
    { key: "med",  label: "Medium", count: counts.med,    cls: "bg-amber-100 text-amber-700" },
    { key: "low",  label: "Low",    count: counts.low,    cls: "bg-green-100 text-green-700" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 w-full text-sm"
            placeholder="Search by title or client…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {/* Sort */}
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <select
            className="input pl-8 pr-8 text-sm appearance-none cursor-pointer"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Risk filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
        {RISK_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRisk(tab.key)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              riskFilter === tab.key
                ? `${tab.cls} border-transparent ring-2 ring-offset-1 ring-current`
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${riskFilter === tab.key ? "bg-white/50" : "bg-slate-100 text-slate-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
        {(query || riskFilter !== "all") && (
          <button
            onClick={() => { setQuery(""); setRisk("all"); }}
            className="text-xs text-slate-400 hover:text-slate-600 ml-2 underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} of {jobs.length} shown</span>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          {jobs.length === 0 ? "No jobs pending validation." : "No jobs match your filters."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
