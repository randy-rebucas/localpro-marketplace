"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Shield, AlertCircle, CheckCircle, Clock, RefreshCw,
  User, ChevronDown, ChevronUp, Building2, Briefcase, FileText,
  MessageSquare, Lock, FilterX,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization } from "@/types";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
interface DisputeItem {
  disputeId: string;
  status: string;
  reason: string;
  evidence: string[];
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  job: { id: string; title: string; category: string; budget: number; escrowStatus: string } | null;
  raisedBy: { id: string; name: string; avatar: string | null; role: string } | null;
  provider: { name: string; avatar: string | null } | null;
  branchLabel: string | null;
}

interface DisputesData {
  disputes: DisputeItem[];
  total: number;
  page: number;
  limit: number;
  openCount: number;
  resolvedCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
type StatusFilter = "all" | "open" | "under_review" | "resolved" | "closed";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All",          value: "all"          },
  { label: "Open",         value: "open"          },
  { label: "Under Review", value: "under_review"  },
  { label: "Resolved",     value: "resolved"      },
  { label: "Closed",       value: "closed"        },
];

const STATUS_BADGE: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  open:         { dot: "bg-red-500",    label: "Open",         bg: "bg-red-50",    text: "text-red-700"   },
  under_review: { dot: "bg-amber-500",  label: "Under Review", bg: "bg-amber-50",  text: "text-amber-700" },
  pending:      { dot: "bg-amber-400",  label: "Pending",      bg: "bg-amber-50",  text: "text-amber-700" },
  resolved:     { dot: "bg-emerald-500",label: "Resolved",     bg: "bg-emerald-50",text: "text-emerald-700"},
  closed:       { dot: "bg-slate-400",  label: "Closed",       bg: "bg-slate-100", text: "text-slate-600" },
};

const ESCROW_BADGE: Record<string, string> = {
  funded:    "bg-amber-50 text-amber-700 border-amber-200",
  released:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  refunded:  "bg-slate-100 text-slate-600 border-slate-200",
  unfunded:  "bg-slate-50 text-slate-500 border-slate-200",
};

function Avatar({ name, avatar, size = "sm" }: { name?: string; avatar?: string | null; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
  if (avatar) return (
    <Image src={avatar} alt={name ?? ""} width={size === "md" ? 36 : 24} height={size === "md" ? 36 : 24}
      className={`${sz} rounded-full object-cover flex-shrink-0`} />
  );
  return (
    <div className={`${sz} rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold flex-shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
    </div>
  );
}

export default function DisputesClient() {
  const [org, setOrg]                         = useState<IBusinessOrganization | null>(null);
  const [orgId, setOrgId]                     = useState("");
  const [data, setData]                       = useState<DisputesData | null>(null);
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>("all");
  const [branchFilter, setBranchFilter]       = useState("all");
  const [page, setPage]                       = useState(1);
  const [loading, setLoading]                 = useState(true);
  const [expanded, setExpanded]               = useState<string | null>(null);

  const load = useCallback(async (p = 1, sf: StatusFilter = "all") => {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org");
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const id = orgData.org._id.toString();
      setOrgId(id);

      const res = await fetchClient<DisputesData>(
        `/api/business/disputes?orgId=${id}&status=${sf}&page=${p}&limit=15`
      );
      setData(res);
    } catch {
      toast.error("Failed to load dispute data.");
    } finally {
      setLoading(false);
    }
  }, []); // deps intentionally empty — always called with explicit args

  useEffect(() => { load(); }, [load]);

  function handleFilter(sf: StatusFilter) {
    setStatusFilter(sf);
    setPage(1);
    load(1, sf);
  }

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  // Branch list derived from org locations
  const branches = org?.locations ?? [];

  // Filtered disputes list (client-side branch filter)
  const shown = data?.disputes.filter((d) =>
    branchFilter === "all" || d.branchLabel === branchFilter
  ) ?? [];

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-9 w-56 bg-slate-200 rounded-lg" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!org || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Shield className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No business profile found.{" "}
          <a href="/client/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  const statusMap = STATUS_BADGE[statusFilter] ?? STATUS_BADGE.open;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Dispute Resolution Center</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{org.name}</p>
          </div>
        </div>
        <button
          onClick={() => load(page)}
          title="Refresh"
          aria-label="Refresh"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── KPI chips ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Open Cases",
            value: data.openCount,
            icon:  AlertCircle,
            color: data.openCount > 0 ? "text-red-600"      : "text-slate-400",
            bg:    data.openCount > 0 ? "bg-red-50"         : "bg-slate-50",
            ring:  data.openCount > 0 ? "ring-red-100"      : "ring-slate-100",
          },
          {
            label: "Resolved Cases",
            value: data.resolvedCount,
            icon:  CheckCircle,
            color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100",
          },
          {
            label: "Total Disputes",
            value: data.total,
            icon:  Shield,
            color: "text-slate-600",   bg: "bg-slate-50",   ring: "ring-slate-100",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className={`${kpi.bg} ring-4 ${kpi.ring} p-3 rounded-xl flex-shrink-0`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === f.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Branch filter */}
        {branches.length > 0 && (
          <div className="ml-auto">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={String(b._id)} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Disputes list ── */}
      <div className="space-y-3">
        {shown.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="bg-emerald-50 rounded-full p-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="font-medium text-slate-700">No disputes found</p>
            <p className="text-sm text-slate-400">
              {statusFilter !== "all" ? (
                <>
                  No <span className="font-medium">{statusMap.label.toLowerCase()}</span> disputes.{" "}
                  <button onClick={() => handleFilter("all")} className="text-primary underline">View all</button>
                </>
              ) : "All clear! No disputes on record."}
            </p>
          </div>
        ) : (
          shown.map((d) => {
            const badge = STATUS_BADGE[d.status] ?? STATUS_BADGE.open;
            const isOpen = expanded === d.disputeId;

            return (
              <div
                key={d.disputeId}
                className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                  isOpen ? "border-primary/30 shadow-sm" : "border-slate-200"
                }`}
              >
                {/* ── Card header ── */}
                <button
                  className="w-full text-left px-5 py-4"
                  onClick={() => setExpanded(isOpen ? null : d.disputeId)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${badge.dot}`} />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate leading-tight">
                            {d.job?.title ?? "Unknown Job"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{d.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        {d.branchLabel && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {d.branchLabel}
                          </span>
                        )}
                        {d.provider && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {d.provider.name}
                          </span>
                        )}
                        {d.job?.category && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> {d.job.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(d.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {d.job?.escrowStatus && d.job.escrowStatus !== "unfunded" && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${ESCROW_BADGE[d.job.escrowStatus] ?? ESCROW_BADGE.unfunded}`}>
                            <Lock className="h-2.5 w-2.5" />
                            Escrow: {d.job.escrowStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* ── Detail panel ── */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50/50">
                    <div className="grid sm:grid-cols-2 gap-5">

                      {/* Raised by */}
                      {d.raisedBy && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Raised By</p>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={d.raisedBy.name} avatar={d.raisedBy.avatar} size="md" />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{d.raisedBy.name}</p>
                              <p className="text-xs text-slate-400 capitalize">{d.raisedBy.role}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Provider */}
                      {d.provider && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Provider</p>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={d.provider.name} avatar={d.provider.avatar} size="md" />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{d.provider.name}</p>
                              <p className="text-xs text-slate-400">Service provider</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Reason</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-xl border border-slate-200 px-4 py-3">
                        {d.reason}
                      </p>
                    </div>

                    {/* Evidence */}
                    {d.evidence.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Evidence ({d.evidence.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {d.evidence.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <FileText className="h-3 w-3" /> File {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution notes */}
                    {d.resolutionNotes && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Resolution Notes</p>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                          <p className="text-sm text-emerald-800 leading-relaxed">{d.resolutionNotes}</p>
                        </div>
                      </div>
                    )}

                    {/* Resolution timeline */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Timeline</p>
                      <div className="relative ml-2 border-l-2 border-slate-200 pl-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Dispute Opened</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(d.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {d.status !== "open" && (
                          <div>
                            <p className="text-xs font-semibold text-slate-700 capitalize">{badge.label}</p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(d.updatedAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Escrow hold status */}
                    {d.job?.escrowStatus === "funded" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                        <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-800">Escrow On Hold</p>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            Funds are currently held in escrow during dispute review. They will be released or refunded once resolved.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Communication stub */}
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <p className="text-xs text-slate-500">
                        For communication threads, view this dispute in{" "}
                        {d.job ? <a href={`/client/jobs/${d.job.id}`} className="text-primary underline">the job page</a> : "the job page"}.
                      </p>
                    </div>

                    {/* Job link */}
                    {d.job && (
                      <a
                        href={`/client/jobs/${d.job.id}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View Job: {d.job.title}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {totalPages} · {data.total} disputes</span>
          <div className="flex gap-2">
            <button
              onClick={() => { const p = page - 1; setPage(p); load(p); }}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => { const p = page + 1; setPage(p); load(p); }}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state when filter applied + no results ── */}
      {shown.length === 0 && branchFilter !== "all" && (
        <div className="text-center py-4">
          <button
            onClick={() => setBranchFilter("all")}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto"
          >
            <FilterX className="h-3.5 w-3.5" /> Clear branch filter
          </button>
        </div>
      )}

    </div>
  );
}
