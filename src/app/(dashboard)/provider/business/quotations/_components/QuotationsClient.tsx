"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  FileText, RefreshCw, ChevronLeft, ChevronRight,
  Search, TrendingUp, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteStatus = "pending" | "accepted" | "rejected";

interface QuoteClient {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface Quote {
  _id: string;
  proposedAmount: number;
  status: QuoteStatus;
  message: string;
  createdAt: string;
  jobId: { _id: string; title: string; category: string; status: string; budget: number; clientId: QuoteClient | null } | null;
}

interface QuoteStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  totalValue: number;
}

interface QuotesResponse {
  quotes: Quote[];
  total: number;
  page: number;
  pages: number;
  stats: QuoteStats;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<QuoteStatus, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const JOB_STATUS_STYLES: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700",
  assigned:    "bg-violet-50 text-violet-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-emerald-50 text-emerald-700",
  cancelled:   "bg-slate-100 text-slate-500",
  disputed:    "bg-red-50 text-red-600",
};

const STATUSES: { value: string; label: string }[] = [
  { value: "",         label: "All" },
  { value: "pending",  label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuotationsClient() {
  const [data, setData]         = useState<QuotesResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState("");
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (s = status, p = page, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "15" });
      if (s) params.set("status", s);
      if (q) params.set("search", q);
      const res = await fetchClient<QuotesResponse>(`/api/provider/agency/quotations?${params}`);
      setData(res);
    } catch {
      toast.error("Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  }, [status, page, search]);

  useEffect(() => { load(); }, [load]);

  function handleStatus(s: string) {
    setStatus(s); setPage(1); setExpanded(new Set());
    load(s, 1, search);
  }

  function handlePage(p: number) {
    setPage(p); setExpanded(new Set());
    load(status, p, search);
  }

  function handleSearch(q: string) {
    setSearch(q); setPage(1); setExpanded(new Set());
    load(status, 1, q);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const quotes   = data?.quotes ?? [];
  const stats    = data?.stats;
  const accepted = stats?.accepted ?? 0;
  const decided  = (stats?.accepted ?? 0) + (stats?.rejected ?? 0);
  const acceptRate = decided > 0 ? Math.round((accepted / decided) * 100) : null;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/30">
            <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Quotations</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{data?.total ?? 0} quote{(data?.total ?? 0) !== 1 ? "s" : ""} found</p>
          </div>
        </div>
        <button
          onClick={() => load()}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── KPI Row ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",       value: stats.total,     icon: FileText,     color: "text-slate-700",   bg: "bg-slate-50",   ring: "ring-slate-100" },
            { label: "Pending",     value: stats.pending,   icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50",   ring: "ring-amber-100" },
            { label: "Accepted",    value: stats.accepted,  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
            { label: "Rejected",    value: stats.rejected,  icon: XCircle,      color: "text-red-500",     bg: "bg-red-50",     ring: "ring-red-100" },
            { label: "Accept Rate", value: acceptRate !== null ? `${acceptRate}%` : "—", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className={`${c.bg} ring-4 ${c.ring} p-2 rounded-xl w-fit`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className={`text-xl font-bold leading-tight ${c.color}`}>
                {typeof c.value === "number" ? c.value : c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Search + Status Filter ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            className="input w-full pl-9"
            placeholder="Search by job title or client name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-shrink-0">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatus(value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                status === value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <FileText className="h-9 w-9 text-slate-300" />
            <p className="text-slate-500 text-sm">No quotations found{status ? ` with status "${status}"` : ""}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Job</th>
                  <th className="text-left px-5 py-3">Client</th>
                  <th className="text-right px-5 py-3">Budget</th>
                  <th className="text-right px-5 py-3">Proposed</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Date</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q) => {
                  const isExpanded = expanded.has(q._id);
                  const diff = q.jobId?.budget ? q.proposedAmount - q.jobId.budget : null;
                  return (
                    <Fragment key={q._id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800 truncate max-w-[180px]">
                            {q.jobId?.title ?? "—"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {q.jobId?.category && (
                              <span className="text-[10px] text-slate-400">{q.jobId.category}</span>
                            )}
                            {q.jobId?.status && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${JOB_STATUS_STYLES[q.jobId.status] ?? "bg-slate-100 text-slate-500"}`}>
                                {q.jobId.status.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-slate-700">{q.jobId?.clientId?.name ?? "—"}</p>
                          <p className="text-[11px] text-slate-400">{q.jobId?.clientId?.email ?? ""}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-slate-400 tabular-nums">
                          {q.jobId?.budget ? formatCurrency(q.jobId.budget) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className="font-semibold text-slate-900">{formatCurrency(q.proposedAmount)}</span>
                          {diff !== null && (
                            <p className={`text-[10px] font-medium mt-0.5 ${
                              diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-600" : "text-slate-400"
                            }`}>
                              {diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? `-${formatCurrency(Math.abs(diff))}` : "at budget"}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[q.status] ?? ""}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(q.createdAt)}
                        </td>
                        <td className="pr-4">
                          {q.message && (
                            <button
                              onClick={() => toggleExpand(q._id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                              title={isExpanded ? "Collapse" : "View message"}
                            >
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && q.message && (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="px-5 pb-4 pt-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quote Message</p>
                            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{q.message}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>Page {data?.page} of {data?.pages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= (data?.pages ?? 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
