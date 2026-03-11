"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, Search, ChevronLeft, ChevronRight,
  ExternalLink, Ban, Loader2, X, Users,
  Pencil, RefreshCw, ShieldOff, ShieldCheck,
  CalendarDays, TrendingUp,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyOwner {
  _id: string;
  name: string;
  email: string;
  isSuspended: boolean;
  isVerified: boolean;
  accountType: string;
}

interface Agency {
  _id: string;
  name: string;
  type: "agency" | "company" | "other";
  logo: string | null;
  plan: string;
  planStatus: string;
  defaultWorkerSharePct: number;
  staff: { _id: string }[];
  providerId: AgencyOwner;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter:    "bg-slate-100   text-slate-600  ring-1 ring-slate-200",
  growth:     "bg-blue-50     text-blue-700   ring-1 ring-blue-200",
  pro:        "bg-violet-50   text-violet-700 ring-1 ring-violet-200",
  enterprise: "bg-amber-50    text-amber-700  ring-1 ring-amber-200",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-50  text-emerald-700 ring-1 ring-emerald-200",
  past_due:  "bg-amber-50    text-amber-700   ring-1 ring-amber-200",
  cancelled: "bg-red-50      text-red-700     ring-1 ring-red-200",
};

const TYPE_LABELS: Record<string, string> = {
  agency:  "Agency",
  company: "Company",
  other:   "Other",
};

function StatCard({ label, value, icon, color }: {
  label: string; value: number | string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${color}`}>
      <div className="shrink-0 opacity-80">{icon}</div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs opacity-70 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  agency: Agency;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ agency, onClose, onSaved }: EditModalProps) {
  const [plan, setPlan]             = useState(agency.plan ?? "starter");
  const [planStatus, setPlanStatus] = useState(agency.planStatus ?? "active");
  const [workerPct, setWorkerPct]   = useState(String(agency.defaultWorkerSharePct ?? 60));
  const [suspend, setSuspend]       = useState(agency.providerId.isSuspended);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    const pct = parseInt(workerPct, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Worker share must be 0–100.");
      return;
    }
    setSaving(true);
    try {
      await fetchClient(`/api/admin/agencies/${agency._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          plan,
          planStatus,
          defaultWorkerSharePct: pct,
          suspendOwner: suspend,
        }),
      });
      toast.success("Agency updated.");
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Modal header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            {agency.logo ? (
              <Image src={agency.logo} alt={agency.name} width={40} height={40} className="rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-violet-600" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{agency.name}</h3>
              <p className="text-xs text-slate-500 truncate">{agency.providerId.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Plan + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {["starter", "growth", "pro", "enterprise"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <select
                value={planStatus}
                onChange={(e) => setPlanStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {[["active","Active"],["past_due","Past Due"],["cancelled","Cancelled"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Worker share */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default Worker Share %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={workerPct}
                onChange={(e) => setWorkerPct(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">%</span>
            </div>
            <p className="text-xs text-slate-400">Percentage of escrow paid to each worker (0 = per-worker override).</p>
          </div>

          {/* Suspend toggle */}
          <label className={`flex items-center justify-between gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors ${suspend ? "border-red-200 bg-red-50" : "border-slate-200 hover:bg-slate-50"}` }>
            <div className="flex items-center gap-2.5">
              {suspend
                ? <ShieldOff size={15} className="text-red-500 shrink-0" />
                : <ShieldCheck size={15} className="text-slate-400 shrink-0" />}
              <div>
                <p className={`text-sm font-medium ${suspend ? "text-red-700" : "text-slate-700"}`}>
                  {suspend ? "Owner suspended" : "Suspend owner account"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Blocks all logins for this agency owner</p>
              </div>
            </div>
            <div className="relative shrink-0">
              <input type="checkbox" className="sr-only peer" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} />
              <div className="w-10 h-5 bg-slate-200 peer-checked:bg-red-500 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgenciesClient() {
  const [agencies, setAgencies]         = useState<Agency[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [planFilter, setPlanFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing]           = useState<Agency | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search       ? { search }                  : {}),
        ...(planFilter   ? { plan: planFilter }         : {}),
        ...(statusFilter ? { planStatus: statusFilter } : {}),
      });
      const data = await fetchClient<{ agencies: Agency[]; total: number }>(`/api/admin/agencies?${qs}`);
      setAgencies(data.agencies);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load agencies.");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages     = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount    = agencies.filter((a) => (a.planStatus ?? "active") === "active").length;
  const suspendedCount = agencies.filter((a) => a.providerId?.isSuspended).length;
  const totalStaff     = agencies.reduce((n, a) => n + (a.staff?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal agency={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100">
              <Building2 size={17} className="text-violet-600" />
            </span>
            Agencies
          </h1>
          <p className="text-sm text-slate-500 mt-1">{total} provider agencies registered on the platform</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      {!loading && agencies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Active plans"      value={activeCount}    icon={<TrendingUp size={18} />}  color="bg-emerald-50 border-emerald-200 text-emerald-700" />
          <StatCard label="Total staff"       value={totalStaff}     icon={<Users size={18} />}       color="bg-violet-50  border-violet-200  text-violet-700"  />
          <StatCard label="Owners suspended"  value={suspendedCount} icon={<ShieldOff size={18} />}  color="bg-red-50     border-red-200     text-red-700"     />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by agency name…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-400"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700"
        >
          <option value="">All Plans</option>
          {["starter", "growth", "pro", "enterprise"].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || planFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(""); setPlanFilter(""); setStatusFilter(""); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Agency</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Owner</th>
                <th className="text-center px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Staff</th>
                <th className="text-center px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Worker %</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Plan</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Registered</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 size={22} className="animate-spin text-violet-400 mx-auto" />
                    <p className="text-xs text-slate-400 mt-2">Loading agencies…</p>
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 size={32} className="text-slate-200" />
                      <p className="text-sm font-medium text-slate-400">No agencies found</p>
                      {(search || planFilter || statusFilter) && (
                        <p className="text-xs text-slate-400">Try adjusting your filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : agencies.map((a) => (
                <tr key={a._id} className="hover:bg-slate-50/60 transition-colors group">
                  {/* Agency */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {a.logo ? (
                        <Image src={a.logo} alt={a.name} width={36} height={36} className="rounded-xl object-cover shrink-0 ring-1 ring-slate-100" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <Building2 size={15} className="text-violet-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{a.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABELS[a.type] ?? a.type}</p>
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {a.providerId?.isSuspended
                        ? <Ban size={12} className="text-red-400 shrink-0" />
                        : a.providerId?.isVerified
                          ? <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                          : null}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 leading-tight truncate max-w-[160px]">{a.providerId?.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{a.providerId?.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Staff count */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-slate-600 text-sm font-medium">
                      <Users size={12} className="text-slate-400" />
                      {a.staff?.length ?? 0}
                    </span>
                  </td>

                  {/* Worker share */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-medium text-slate-600">
                      {(a.defaultWorkerSharePct ?? 0) > 0
                        ? `${a.defaultWorkerSharePct}%`
                        : <span className="text-slate-300">—</span>}
                    </span>
                  </td>

                  {/* Plan + status stacked */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize w-fit ${PLAN_COLORS[a.plan ?? ""] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                        {a.plan ?? "—"}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize w-fit ${STATUS_COLORS[a.planStatus ?? ""] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                        {(a.planStatus ?? "active").replace("_", " ")}
                      </span>
                    </div>
                  </td>

                  {/* Registered */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <CalendarDays size={12} className="shrink-0" />
                      {formatDate(a.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/users/${a.providerId?._id}`}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="View owner profile"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        onClick={() => setEditing(a)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                        title="Edit agency"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} agencies
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 transition-colors border border-transparent hover:border-slate-200"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-slate-500 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 transition-colors border border-transparent hover:border-slate-200"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
