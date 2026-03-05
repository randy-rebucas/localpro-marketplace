"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Briefcase, Plus, Upload, RefreshCw, Filter, ChevronLeft, ChevronRight,
  X, Clock, CheckCircle2, AlertTriangle, DollarSign, MapPin, Calendar,
  User, ImageIcon, FileText, RotateCcw, Download, ExternalLink,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import type { IBusinessOrganization } from "@/types";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobRow {
  _id: string;
  title: string;
  category: string;
  status: string;
  escrowStatus: string;
  budget: number;
  location: string;
  scheduleDate: string;
  createdAt: string;
  providerId?: { _id: string; name: string; avatar?: string } | null;
  clientId?: { _id: string; name: string } | null;
  milestones?: Milestone[];
  description?: string;
  specialInstructions?: string;
  beforePhoto?: string[];
  afterPhoto?: string[];
  recurringScheduleId?: string | null;
}

interface Milestone {
  _id: string;
  title: string;
  amount: number;
  description?: string;
  status: "pending" | "released";
}

interface RecurringRow {
  _id: string;
  title: string;
  category: string;
  frequency: string;
  status: string;
  budget: number;
  location: string;
  nextRunAt: string;
  totalRuns: number;
  maxRuns?: number | null;
}

interface CsvRow {
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  scheduleDate: string;
  specialInstructions?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "open",        label: "Open" },
  { value: "assigned",    label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "disputed",    label: "Disputed" },
  { value: "cancelled",   label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
  open:               "bg-blue-100 text-blue-700",
  assigned:           "bg-violet-100 text-violet-700",
  in_progress:        "bg-amber-100 text-amber-800",
  completed:          "bg-emerald-100 text-emerald-700",
  disputed:           "bg-orange-100 text-orange-700",
  cancelled:          "bg-red-100 text-red-600",
  rejected:           "bg-red-100 text-red-600",
  refunded:           "bg-slate-100 text-slate-500",
  pending_validation: "bg-slate-100 text-slate-500",
  expired:            "bg-slate-100 text-slate-400",
};

const ESCROW_BADGE: Record<string, string> = {
  not_funded: "bg-slate-100 text-slate-400",
  funded:     "bg-emerald-100 text-emerald-700",
  released:   "bg-teal-100 text-teal-700",
  refunded:   "bg-rose-100 text-rose-600",
};

const CSV_TEMPLATE =
  "title,category,description,budget,location,scheduleDate,specialInstructions\n" +
  '"Deep Cleaning","Cleaning","Full office cleaning including all floors",3500,"Cebu City, Cebu","2026-04-10","After hours preferred"\n';

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const clean = (v?: string) => (v ?? "").replace(/^"|"$/g, "").trim();
  return lines.slice(1)
    .map((line) => {
      const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? [];
      const get = (key: string) => clean(cols[header.indexOf(key)]);
      return {
        title:               get("title"),
        category:            get("category"),
        description:         get("description"),
        budget:              get("budget"),
        location:            get("location"),
        scheduleDate:        get("scheduledate"),
        specialInstructions: get("specialinstructions") || undefined,
      };
    })
    .filter((r) => r.title.length > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobsClient() {
  const [org, setOrg]             = useState<IBusinessOrganization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  // filters
  const [locationId, setLocationId] = useState("");
  const [status, setStatus]         = useState("");
  const [category, setCategory]     = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [page, setPage]             = useState(1);

  // jobs list
  const [jobs, setJobs]           = useState<JobRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const [listLoading, setListLoading] = useState(false);

  // detail
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [detail, setDetail]               = useState<JobRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [releasingId, setReleasingId]     = useState<string | null>(null);

  // bulk upload
  const [showBulk, setShowBulk]             = useState(false);
  const [csvRows, setCsvRows]               = useState<CsvRow[]>([]);
  const [bulkUploading, setBulkUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // recurring
  const [showRecurring, setShowRecurring]       = useState(false);
  const [recurringRows, setRecurringRows]       = useState<RecurringRow[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);

  // ── load org ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org")
      .then((d) => setOrg(d.org))
      .catch(() => {})
      .finally(() => setOrgLoading(false));
  }, []);

  // ── load jobs ──────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    if (!org) return;
    setListLoading(true);
    try {
      const sp = new URLSearchParams({ orgId: String(org._id), page: String(page), limit: "20" });
      if (locationId) sp.set("locationId", locationId);
      if (status)     sp.set("status",     status);
      if (category)   sp.set("category",   category);
      if (dateFrom)   sp.set("dateFrom",   dateFrom);
      if (dateTo)     sp.set("dateTo",     dateTo);
      const data = await fetchClient<{ jobs: JobRow[]; total: number; pages: number }>(`/api/business/jobs?${sp}`);
      setJobs(data.jobs);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error("Failed to load jobs.");
    } finally {
      setListLoading(false);
    }
  }, [org, locationId, status, category, dateFrom, dateTo, page]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── sync detail when jobs list changes or selectedId changes ──────────────
  useEffect(() => {
    if (!selectedId) return;
    const found = jobs.find((j) => j._id === selectedId);
    if (found) { setDetail(found); return; }
    // Item not on current page — fetch full detail from API
    setDetailLoading(true);
    fetchClient<{ job: JobRow }>(`/api/jobs/${selectedId}`)
      .then((d) => setDetail(d.job))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── load recurring ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showRecurring || !org) return;
    setRecurringLoading(true);
    fetchClient<{ schedules: RecurringRow[] }>(`/api/business/jobs/recurring?orgId=${String(org._id)}`)
      .then((d) => setRecurringRows(d.schedules))
      .catch(() => {})
      .finally(() => setRecurringLoading(false));
  }, [showRecurring, org]);

  // ── CSV ───────────────────────────────────────────────────────────────────
  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setCsvRows(parseCsv((e.target?.result as string) ?? ""));
    reader.onerror = () => toast.error("Failed to read CSV file.");
    reader.readAsText(file);
  }

  async function submitBulk() {
    if (!org || csvRows.length === 0) return;
    setBulkUploading(true);
    try {
      const payload = csvRows.map((r) => ({
        title:               r.title,
        category:            r.category,
        description:         r.description,
        budget:              parseFloat(r.budget) || 0,
        location:            r.location,
        scheduleDate:        r.scheduleDate.includes("T") ? r.scheduleDate : `${r.scheduleDate}T08:00:00.000Z`,
        specialInstructions: r.specialInstructions,
      }));
      const result = await fetchClient<{ created: number; failed: number }>("/api/business/jobs/bulk", {
        method: "POST",
        body: JSON.stringify({ orgId: String(org._id), jobs: payload }),
      });
      toast.success(`${result.created} job(s) created${result.failed > 0 ? `, ${result.failed} failed` : ""}.`);
      setShowBulk(false); setCsvRows([]); setPage(1); loadJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBulkUploading(false);
    }
  }

  // ── escrow actions ────────────────────────────────────────────────────────
  async function releaseFullEscrow(jobId: string) {
    if (!confirm("Release full escrow to provider?")) return;
    setReleasingId(jobId);
    try {
      await fetchClient(`/api/jobs/${jobId}/release-escrow`, { method: "POST" });
      toast.success("Escrow released.");
      loadJobs();
      setDetail((d) => d ? { ...d, escrowStatus: "released" } : d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Release failed.");
    } finally { setReleasingId(null); }
  }

  async function releaseMilestone(jobId: string, mId: string) {
    if (!confirm("Release this milestone?")) return;
    const key = `${jobId}-${mId}`;
    setReleasingId(key);
    try {
      await fetchClient(`/api/jobs/${jobId}/milestones/${mId}/release`, { method: "POST" });
      toast.success("Milestone released.");
      loadJobs();
      setDetail((d) => d ? {
        ...d,
        milestones: d.milestones?.map((m) => m._id === mId ? { ...m, status: "released" as const } : m),
      } : d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Release failed.");
    } finally { setReleasingId(null); }
  }

  const hasFilters = !!(locationId || status || category || dateFrom || dateTo);

  // ── loading ───────────────────────────────────────────────────────────────
  if (orgLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="h-12 bg-slate-200 rounded-2xl" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Briefcase className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No business profile.{" "}
          <a href="/client/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Job Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} job{total !== 1 ? "s" : ""} · {org.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowRecurring((v) => !v); setShowBulk(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${showRecurring ? "border-primary/40 bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Recurring
          </button>
          <button
            onClick={() => { setShowBulk((v) => !v); setShowRecurring(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${showBulk ? "border-primary/40 bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <Upload className="h-3.5 w-3.5" /> Bulk Upload
          </button>
          <Link href="/jobs/post" className="btn-primary flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> New Job
          </Link>
        </div>
      </div>

      {/* ── Bulk Upload Panel ──────────────────────────────────────────────── */}
      {showBulk && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Bulk Job Upload</h2>
              <p className="text-xs text-slate-400 mt-0.5">Upload a CSV to create up to 50 jobs at once.</p>
            </div>
            <button onClick={() => { setShowBulk(false); setCsvRows([]); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <button
            onClick={() => {
              const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "jobs_template.csv"; a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </button>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/2 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
          >
            <Upload className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Drop CSV here or <span className="text-primary font-medium">click to browse</span></p>
            <p className="text-xs text-slate-400 mt-1">Required: title, category, description, budget, location, scheduleDate</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
          </div>

          {/* Preview table */}
          {csvRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">{csvRows.length} row{csvRows.length !== 1 ? "s" : ""} — preview:</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Title","Category","Budget","Location","Date"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {csvRows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 max-w-[180px] truncate font-medium text-slate-800">{r.title}</td>
                        <td className="px-3 py-2 text-slate-500">{r.category}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-700">{formatCurrency(parseFloat(r.budget) || 0)}</td>
                        <td className="px-3 py-2 max-w-[140px] truncate text-slate-500">{r.location}</td>
                        <td className="px-3 py-2 text-slate-500">{r.scheduleDate}</td>
                      </tr>
                    ))}
                    {csvRows.length > 8 && (
                      <tr><td colSpan={5} className="px-3 py-2 text-center text-slate-400">…and {csvRows.length - 8} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button onClick={submitBulk} disabled={bulkUploading} className="btn-primary">
                  {bulkUploading ? "Creating jobs…" : `Create ${csvRows.length} Job${csvRows.length !== 1 ? "s" : ""}`}
                </button>
                <button onClick={() => setCsvRows([])} className="btn-secondary">Clear</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recurring Panel ────────────────────────────────────────────────── */}
      {showRecurring && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Recurring Job Scheduler</h2>
              <p className="text-xs text-slate-400 mt-0.5">Auto-spawned job schedules for this organization.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/jobs/recurring/new" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                <Plus className="h-3 w-3" /> New Schedule
              </Link>
              <button onClick={() => setShowRecurring(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {recurringLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-slate-200 rounded-xl" />)}
            </div>
          ) : recurringRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <RefreshCw className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-400">No recurring schedules yet.</p>
              <Link href="/jobs/recurring/new" className="text-xs text-primary underline">Create your first recurring job →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recurringRows.map((r) => (
                <div key={r._id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    r.status === "active"  ? "bg-emerald-100 text-emerald-600" :
                    r.status === "paused"  ? "bg-amber-100 text-amber-600" :
                                            "bg-slate-200 text-slate-500"
                  }`}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.title}</p>
                    <p className="text-xs text-slate-400">
                      {r.frequency} · {r.category} · {formatCurrency(r.budget)}
                      {r.totalRuns > 0 && ` · ${r.totalRuns} run${r.totalRuns !== 1 ? "s" : ""}`}
                      {r.maxRuns != null && ` / ${r.maxRuns}`}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      r.status === "active"  ? "bg-emerald-100 text-emerald-700" :
                      r.status === "paused"  ? "bg-amber-100 text-amber-700" :
                                              "bg-slate-100 text-slate-500"
                    }`}>{r.status}</span>
                    <Link href={`/jobs/recurring/${r._id}`} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        {/* Row 1 — Branch / Status / Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Branch</label>
            <select className="input w-full text-sm py-1.5" value={locationId}
              onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
              <option value="">All Branches</option>
              {org.locations.filter((l) => l.isActive).map((l) => (
                <option key={String(l._id)} value={String(l._id)}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
            <select className="input w-full text-sm py-1.5" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
            <input className="input w-full text-sm py-1.5" placeholder="e.g. Cleaning"
              value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} />
          </div>
        </div>

        {/* Row 2 — Date range + Clear */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1 flex-1 min-w-[130px]">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date From</label>
            <input type="date" className="input w-full text-sm py-1.5" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1 flex-1 min-w-[130px]">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date To</label>
            <input type="date" className="input w-full text-sm py-1.5" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          <div className="flex-shrink-0 pb-px">
            {hasFilters ? (
              <button
                onClick={() => { setLocationId(""); setStatus(""); setCategory(""); setDateFrom(""); setDateTo(""); setPage(1); }}
                className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Clear filters
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-[7px] rounded-xl text-xs text-slate-300 border border-transparent select-none">
                <Filter className="h-3 w-3" /> Filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content pane ───────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${selectedId ? "grid-cols-1 lg:grid-cols-[1fr_400px]" : "grid-cols-1"}`}>

        {/* Jobs table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {listLoading ? (
            <div className="animate-pulse p-4 space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-lg" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Briefcase className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">
                {hasFilters ? "No jobs match the current filters." : "No jobs found for this organization."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Job</th>
                      <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                      <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Provider</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {jobs.map((job) => (
                      <tr
                        key={job._id}
                        onClick={() => setSelectedId(selectedId === job._id ? null : job._id)}
                        className={`cursor-pointer transition-colors ${selectedId === job._id ? "bg-primary/5" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]">{job.title}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(job.scheduleDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            {job.recurringScheduleId && <span title="Recurring"><RefreshCw className="h-2.5 w-2.5 text-violet-400 ml-1" /></span>}
                          </p>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{job.category}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[job.status] ?? "bg-slate-100 text-slate-500"}`}>
                              {job.status.replace(/_/g, " ")}
                            </span>
                            {job.escrowStatus !== "not_funded" && (
                              <div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ESCROW_BADGE[job.escrowStatus] ?? ""}`}>
                                  {job.escrowStatus}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          {job.providerId ? (
                            <div className="flex items-center gap-2">
                              {job.providerId.avatar ? (
                                <Image src={job.providerId.avatar} alt="" width={20} height={20} className="rounded-full w-5 h-5 object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                                  {job.providerId.name[0]}
                                </div>
                              )}
                              <span className="text-xs text-slate-600 truncate max-w-[100px]">{job.providerId.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                          {formatCurrency(job.budget)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Page {page} of {pages} · {total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      aria-label="Previous page"
                      className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                      <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                      aria-label="Next page"
                      className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Detail Panel ─────────────────────────────────────────────────── */}
        {selectedId && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden self-start sticky top-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{detail?.title ?? "Loading…"}</p>
                {detail && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[detail.status] ?? "bg-slate-100"}`}>
                      {detail.status.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESCROW_BADGE[detail.escrowStatus] ?? ""}`}>
                      {detail.escrowStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {detail && (
                  <Link href={`/jobs/${detail._id}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                <button onClick={() => { setSelectedId(null); setDetail(null); }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="animate-pulse space-y-3 p-5">
                {[...Array(5)].map((_, i) => <div key={i} className="h-6 bg-slate-200 rounded" />)}
              </div>
            ) : detail ? (
              <div className="p-5 space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto">

                {/* Scope of Work */}
                <section className="space-y-2">
                  <SectionHead icon={<FileText className="h-3.5 w-3.5" />} title="Scope of Work" />
                  <p className="text-sm text-slate-700 leading-relaxed">{detail.description ?? "No description."}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{detail.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                      {new Date(detail.scheduleDate).toLocaleDateString("en-PH")}
                    </span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(detail.budget)}</span>
                  </div>
                </section>

                {/* Provider */}
                {detail.providerId && (
                  <section className="space-y-2">
                    <SectionHead icon={<User className="h-3.5 w-3.5" />} title="Provider" />
                    <div className="flex items-center gap-2.5">
                      {detail.providerId.avatar ? (
                        <Image src={detail.providerId.avatar} alt="" width={32} height={32} className="rounded-full w-8 h-8 object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {detail.providerId.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{detail.providerId.name}</p>
                        <Link href={`/providers/${detail.providerId._id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          View profile <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  </section>
                )}

                {/* Milestones */}
                {(detail.milestones?.length ?? 0) > 0 && (
                  <section className="space-y-2">
                    <SectionHead icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Milestone Tracker" />
                    <div className="space-y-2">
                      {detail.milestones!.map((m, i) => (
                        <div key={m._id} className={`flex items-center gap-3 p-3 rounded-xl border ${m.status === "released" ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.status === "released" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{m.title}</p>
                            <p className="text-[11px] text-slate-500">{formatCurrency(m.amount)}{m.description ? ` · ${m.description}` : ""}</p>
                          </div>
                          {m.status === "pending" && detail.escrowStatus === "funded" ? (
                            <button
                              onClick={() => releaseMilestone(detail._id, m._id)}
                              disabled={releasingId === `${detail._id}-${m._id}`}
                              className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {releasingId === `${detail._id}-${m._id}` ? "…" : "Release"}
                            </button>
                          ) : m.status === "released" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Before / After Photos */}
                {((detail.beforePhoto?.length ?? 0) + (detail.afterPhoto?.length ?? 0)) > 0 && (
                  <section className="space-y-2">
                    <SectionHead icon={<ImageIcon className="h-3.5 w-3.5" />} title="Before / After Photos" />
                    {["before", "after"].map((phase) => {
                      const photos = phase === "before" ? detail.beforePhoto : detail.afterPhoto;
                      if (!photos?.length) return null;
                      return (
                        <div key={phase}>
                          <p className="text-[11px] text-slate-400 mb-1.5 uppercase tracking-wide font-semibold">{phase}</p>
                          <div className="flex flex-wrap gap-2">
                            {photos.map((src, i) => (
                              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                                <Image src={src} alt={`${phase} ${i + 1}`} width={72} height={72}
                                  className="w-[72px] h-[72px] rounded-lg object-cover border border-slate-200 hover:opacity-80" />
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                )}

                {/* Provider Notes */}
                {detail.specialInstructions && (
                  <section className="space-y-2">
                    <SectionHead icon={<FileText className="h-3.5 w-3.5" />} title="Provider Notes" />
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">{detail.specialInstructions}</p>
                  </section>
                )}

                {/* Escrow Release */}
                {detail.escrowStatus === "funded" && !detail.milestones?.length && (
                  <section>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800">Escrow Release</p>
                      </div>
                      <p className="text-xs text-emerald-600">Escrow is funded. Release when work is complete.</p>
                      <button
                        onClick={() => releaseFullEscrow(detail._id)}
                        disabled={releasingId === detail._id}
                        className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {releasingId === detail._id ? "Releasing…" : `Release ${formatCurrency(detail.budget)} to Provider`}
                      </button>
                    </div>
                  </section>
                )}

                {/* Open job — awaiting quotes */}
                {detail.status === "open" && !detail.providerId && (
                  <section>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> Awaiting Provider
                      </p>
                      <p className="text-xs text-blue-600">Waiting for provider quotes. Review and approve from the full job page.</p>
                      <Link href={`/jobs/${detail._id}`}
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                        Review Quotes <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </section>
                )}

                {/* Disputed */}
                {detail.status === "disputed" && (
                  <section>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> Dispute Active
                      </p>
                      <p className="text-xs text-orange-600">Escrow is on hold pending admin resolution.</p>
                      <Link href="/disputes" className="text-xs text-orange-700 underline font-medium">View Dispute Center →</Link>
                    </div>
                  </section>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
      {icon} {title}
    </h3>
  );
}
