"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Briefcase, RefreshCw, X, Clock, CheckCircle2, DollarSign,
  Calendar, User, ChevronLeft, ChevronRight, Search, AlertTriangle,
  Play, XCircle,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyProfile {
  _id: string;
  name: string;
}

interface StaffMember {
  _id: string;
  userId: { _id: string; name: string; avatar?: string | null } | string;
  role: string;
}

interface JobRow {
  _id: string;
  title: string;
  category: string;
  status: string;
  budget: number;
  location: string;
  scheduleDate: string;
  assignedStaff?: { _id: string; name: string; avatar?: string | null } | null;
  description?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_STATUSES = [
  { value: "",            label: "All Statuses" },
  { value: "open",        label: "Open" },
  { value: "assigned",    label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  assigned:    "bg-violet-100 text-violet-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-red-100 text-red-600",
  disputed:    "bg-orange-100 text-orange-700",
};

const STATUS_ACTIONS: Record<string, { label: string; status: string; icon: React.ElementType; cls: string }[]> = {
  open:        [{ label: "Mark Assigned",  status: "assigned",    icon: User,         cls: "bg-violet-600 hover:bg-violet-700 text-white" }],
  assigned:    [{ label: "Start Progress", status: "in_progress", icon: Play,         cls: "bg-amber-500 hover:bg-amber-600 text-white" },
                { label: "Cancel",         status: "cancelled",   icon: XCircle,      cls: "border border-red-300 text-red-600 hover:bg-red-50" }],
  in_progress: [{ label: "Mark Completed", status: "completed",   icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700 text-white" },
                { label: "Cancel",         status: "cancelled",   icon: XCircle,      cls: "border border-red-300 text-red-600 hover:bg-red-50" }],
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DispatchClient() {
  const [agency, setAgency]               = useState<AgencyProfile | null>(null);
  const [agencyLoading, setAgencyLoading] = useState(true);
  const [staff, setStaff]                 = useState<StaffMember[]>([]);
  const [statusFilter, setStatusFilter]   = useState("");
  const [search, setSearch]               = useState("");
  const [page, setPage]                   = useState(1);
  const [jobs, setJobs]                   = useState<JobRow[]>([]);
  const [total, setTotal]                 = useState(0);
  const [pages, setPages]                 = useState(1);
  const [listLoading, setListLoading]     = useState(false);
  const [selectedJob, setSelectedJob]     = useState<JobRow | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assigning, setAssigning]         = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // ── Load agency + staff ─────────────────────────────────────────────────
  useEffect(() => {
    fetchClient<{ agency: AgencyProfile | null }>("/api/provider/agency/profile")
      .then(async (d) => {
        setAgency(d.agency);
        if (d.agency) {
          try {
            const sd = await fetchClient<{ staff: StaffMember[] }>(
              `/api/provider/agency/staff?agencyId=${d.agency._id}`
            );
            setStaff(sd.staff);
          } catch { /* silent */ }
        }
      })
      .catch(() => {})
      .finally(() => setAgencyLoading(false));
  }, []);

  // ── Load jobs ────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    if (!agency) return;
    setListLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) sp.set("status", statusFilter);
      if (search)       sp.set("search", search);
      const data = await fetchClient<{ jobs: JobRow[]; total: number; pages: number }>(
        `/api/provider/agency/jobs?${sp}`
      );
      setJobs(data.jobs);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error("Failed to load jobs.");
    } finally {
      setListLoading(false);
    }
  }, [agency, statusFilter, search, page]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Assign staff ─────────────────────────────────────────────────────────
  async function handleAssign() {
    if (!selectedJob || !assignStaffId) return;
    setAssigning(true);
    try {
      await fetchClient(`/api/provider/agency/jobs/${selectedJob._id}/assign`, {
        method: "POST",
        body: JSON.stringify({ staffId: assignStaffId }),
      });
      toast.success("Job assigned.");
      setAssignStaffId("");
      setSelectedJob((prev) => prev ? { ...prev, status: "assigned" } : null);
      await loadJobs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setAssigning(false);
    }
  }

  // ── Status transition ─────────────────────────────────────────────────────
  async function handleStatusChange(newStatus: string) {
    if (!selectedJob) return;
    setTransitioning(true);
    try {
      await fetchClient(`/api/provider/agency/jobs/${selectedJob._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Job marked as ${newStatus.replace(/_/g, " ")}.`);
      setSelectedJob((prev) => prev ? { ...prev, status: newStatus } : null);
      await loadJobs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setTransitioning(false);
    }
  }

  function getStaffName(m: StaffMember) {
    if (typeof m.userId === "object" && m.userId !== null) return (m.userId as { name: string }).name;
    return "Staff";
  }

  function getStaffAvatar(m: StaffMember): string | null {
    if (typeof m.userId === "object" && m.userId !== null)
      return (m.userId as { avatar?: string | null }).avatar ?? null;
    return null;
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (agencyLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="h-16 bg-slate-200 rounded-2xl" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Briefcase className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No agency profile.{" "}
          <a href="/provider/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  const actions = STATUS_ACTIONS[selectedJob?.status ?? ""] ?? [];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Job Dispatch</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} job{total !== 1 ? "s" : ""} · {agency.name}
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              className="input w-full text-sm py-1.5"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input w-full text-sm py-1.5 pl-9"
                placeholder="Search job title…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content grid ── */}
      <div className={`grid gap-4 ${selectedJob ? "grid-cols-1 lg:grid-cols-[1fr_380px]" : "grid-cols-1"}`}>

        {/* Jobs table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {listLoading ? (
            <div className="animate-pulse p-4 space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-lg" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Briefcase className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No jobs found.</p>
              {(statusFilter || search) && (
                <button
                  onClick={() => { setStatusFilter(""); setSearch(""); setPage(1); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
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
                      <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Assigned</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {jobs.map((job) => (
                      <tr
                        key={job._id}
                        onClick={() => {
                          setSelectedJob(selectedJob?._id === job._id ? null : job);
                          setAssignStaffId("");
                        }}
                        className={`cursor-pointer transition-colors ${selectedJob?._id === job._id ? "bg-primary/5" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]">{job.title}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                            {job.scheduleDate
                              ? new Date(job.scheduleDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                              : "No date set"}
                          </p>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{job.category}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[job.status] ?? "bg-slate-100 text-slate-500"}`}>
                            {job.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          {job.assignedStaff ? (
                            <div className="flex items-center gap-1.5">
                              {job.assignedStaff.avatar ? (
                                <Image src={job.assignedStaff.avatar} alt={job.assignedStaff.name} width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                                  {job.assignedStaff.name[0]}
                                </div>
                              )}
                              <span className="text-xs text-slate-600">{job.assignedStaff.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Unassigned</span>
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

              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Page {page} of {pages} · {total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      aria-label="Previous page" className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                      <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                      aria-label="Next page" className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Detail / Assign Panel ── */}
        {selectedJob && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden self-start sticky top-4">

            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate leading-tight">{selectedJob.title}</p>
                <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[selectedJob.status] ?? "bg-slate-100"}`}>
                  {selectedJob.status.replace(/_/g, " ")}
                </span>
              </div>
              <button
                onClick={() => { setSelectedJob(null); setAssignStaffId(""); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg flex-shrink-0 transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-5">

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{selectedJob.category}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedJob.budget)}</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{selectedJob.scheduleDate
                    ? new Date(selectedJob.scheduleDate).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                    : "No date set"}</span>
                </div>
                {selectedJob.description && (
                  <p className="bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed whitespace-pre-line">
                    {selectedJob.description}
                  </p>
                )}
              </div>

              {selectedJob.assignedStaff && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-2.5">
                  {selectedJob.assignedStaff.avatar ? (
                    <Image src={selectedJob.assignedStaff.avatar} alt={selectedJob.assignedStaff.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-violet-700" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-violet-800">Currently assigned</p>
                    <p className="text-xs text-violet-600">{selectedJob.assignedStaff.name}</p>
                  </div>
                </div>
              )}

              {actions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((a) => (
                      <button
                        key={a.status}
                        onClick={() => handleStatusChange(a.status)}
                        disabled={transitioning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${a.cls}`}
                      >
                        <a.icon className="h-3.5 w-3.5" />
                        {transitioning ? "Updating…" : a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.status === "completed" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 font-medium">Job completed successfully.</p>
                </div>
              )}
              {selectedJob.status === "cancelled" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-medium">Job has been cancelled.</p>
                </div>
              )}
              {selectedJob.status === "in_progress" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Job is currently in progress.</p>
                </div>
              )}
              {selectedJob.status === "open" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">Open and awaiting assignment.</p>
                </div>
              )}

              {!["completed", "cancelled", "disputed"].includes(selectedJob.status) && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assign to Staff</h3>
                  {staff.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No staff available.{" "}
                      <a href="/provider/business/staff" className="text-primary underline">Add staff first.</a>
                    </p>
                  ) : (
                    <>
                      <select
                        className="input w-full text-sm"
                        value={assignStaffId}
                        onChange={(e) => setAssignStaffId(e.target.value)}
                      >
                        <option value="">Select staff member…</option>
                        {staff.map((s) => (
                          <option key={s._id} value={s._id}>{getStaffName(s)} ({s.role})</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssign}
                        disabled={!assignStaffId || assigning}
                        className="w-full py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {assigning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {assigning ? "Assigning…" : "Assign Job"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {staff.length > 0 && !["completed", "cancelled", "disputed"].includes(selectedJob.status) && (
              <div className="px-5 pb-5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Pick</p>
                <div className="flex flex-wrap gap-2">
                  {staff.slice(0, 8).map((s) => {
                    const name   = getStaffName(s);
                    const avatar = getStaffAvatar(s);
                    return (
                      <button
                        key={s._id}
                        onClick={() => setAssignStaffId(s._id)}
                        title={name}
                        className={`flex-shrink-0 transition-transform hover:scale-105 ${assignStaffId === s._id ? "ring-2 ring-primary ring-offset-1 rounded-full" : ""}`}
                      >
                        {avatar ? (
                          <Image src={avatar} alt={name} width={30} height={30} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {name[0]}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
