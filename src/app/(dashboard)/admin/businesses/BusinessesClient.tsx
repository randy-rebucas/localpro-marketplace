"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Search, ChevronLeft, ChevronRight,
  ExternalLink, Ban, Loader2, X, MapPin,
  Pencil, RefreshCw, ShieldOff, ShieldCheck,
  CalendarDays, TrendingUp, Briefcase,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgOwner {
  _id: string;
  name: string;
  email: string;
  isSuspended: boolean;
  isVerified: boolean;
}

interface BusinessOrg {
  _id: string;
  name: string;
  type: "hotel" | "company" | "other";
  logo: string | null;
  plan: string;
  planStatus: string;
  defaultMonthlyBudget: number;
  locations: { _id: string; label: string; isActive: boolean }[];
  ownerId: OrgOwner;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter:    "bg-slate-100   text-slate-600  ring-1 ring-slate-200  dark:bg-slate-700   dark:text-slate-300  dark:ring-slate-600",
  growth:     "bg-blue-50     text-blue-700   ring-1 ring-blue-200   dark:bg-blue-900/30  dark:text-blue-300   dark:ring-blue-800",
  pro:        "bg-violet-50   text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800",
  enterprise: "bg-amber-50    text-amber-700  ring-1 ring-amber-200  dark:bg-amber-900/30 dark:text-amber-300  dark:ring-amber-800",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-50  text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
  past_due:  "bg-amber-50    text-amber-700   ring-1 ring-amber-200  dark:bg-amber-900/30  dark:text-amber-300  dark:ring-amber-800",
  cancelled: "bg-red-50      text-red-700     ring-1 ring-red-200    dark:bg-red-900/30    dark:text-red-300    dark:ring-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  hotel:   "Hotel",
  company: "Company",
  other:   "Other",
};

function StatCard({ label, value, icon, color }: {
  label: string; value: number | string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${color}`}>
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
  org: BusinessOrg;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ org, onClose, onSaved }: EditModalProps) {
  const [plan, setPlan]             = useState(org.plan ?? "starter");
  const [planStatus, setPlanStatus] = useState(org.planStatus ?? "active");
  const [budget, setBudget]         = useState(String(org.defaultMonthlyBudget ?? ""));
  const [suspend, setSuspend]       = useState(org.ownerId.isSuspended);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetchClient(`/api/admin/businesses/${org._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          plan,
          planStatus,
          suspendOwner: suspend,
          ...(budget !== "" ? { defaultMonthlyBudget: Number(budget) } : {}),
        }),
      });
      toast.success("Business updated.");
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Modal header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            {org.logo ? (
              <Image src={org.logo} alt={org.name} width={40} height={40} className="rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">{org.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{org.ownerId.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Plan + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {["starter", "growth", "pro", "enterprise"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</label>
              <select
                value={planStatus}
                onChange={(e) => setPlanStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {[["active","Active"],["past_due","Past Due"],["cancelled","Cancelled"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Default Monthly Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">₱</span>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Leave blank to keep the current value unchanged.</p>
          </div>

          {/* Suspend toggle */}
          <label className={`flex items-center justify-between gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors ${suspend ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20" : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}>
            <div className="flex items-center gap-2.5">
              {suspend
                ? <ShieldOff size={15} className="text-red-500 shrink-0" />
                : <ShieldCheck size={15} className="text-slate-400 shrink-0" />}
              <div>
                <p className={`text-sm font-semibold ${suspend ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                  {suspend ? "Owner suspended" : "Suspend owner account"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Blocks all logins for this business owner</p>
              </div>
            </div>
            <div className="relative shrink-0">
              <input type="checkbox" className="sr-only peer" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} />
              <div className="w-10 h-5 bg-slate-200 dark:bg-slate-600 peer-checked:bg-red-500 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
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

export default function BusinessesClient() {
  const [orgs, setOrgs]                 = useState<BusinessOrg[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [planFilter, setPlanFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing]           = useState<BusinessOrg | null>(null);
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
      const data = await fetchClient<{ orgs: BusinessOrg[]; total: number }>(`/api/admin/businesses?${qs}`);
      setOrgs(data.orgs);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load businesses.");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages     = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount    = orgs.filter((o) => (o.planStatus ?? "active") === "active").length;
  const suspendedCount = orgs.filter((o) => o.ownerId?.isSuspended).length;
  const totalLocations = orgs.reduce((n, o) => n + (o.locations?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      {editing && (
        <EditModal org={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}

      {/* Toolbar: count + refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{total} business organizations registered</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      {!loading && orgs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Active plans"      value={activeCount}    icon={<TrendingUp size={18} />}  color="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300" />
          <StatCard label="Total locations"   value={totalLocations} icon={<MapPin size={18} />}     color="bg-blue-50    border-blue-200    text-blue-700    dark:bg-blue-900/20    dark:border-blue-800    dark:text-blue-300"    />
          <StatCard label="Owners suspended"  value={suspendedCount} icon={<ShieldOff size={18} />}  color="bg-red-50     border-red-200     text-red-700     dark:bg-red-900/20     dark:border-red-800     dark:text-red-300"     />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by organization name…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Plans</option>
          {["starter", "growth", "pro", "enterprise"].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || planFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(""); setPlanFilter(""); setStatusFilter(""); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-700/50">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Organization</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Owner</th>
                <th className="text-center px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Locations</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Plan</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Registered</th>
                <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={22} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Loading organizations…</p>
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700">
                        <Briefcase size={28} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No organizations found</p>
                      {(search || planFilter || statusFilter) && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : orgs.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors group">
                  {/* Org */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {o.logo ? (
                        <Image src={o.logo} alt={o.name} width={36} height={36} className="rounded-xl object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-600" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Briefcase size={15} className="text-blue-500 dark:text-blue-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white leading-tight">{o.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{TYPE_LABELS[o.type] ?? o.type}</p>
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {o.ownerId?.isSuspended
                        ? <Ban size={12} className="text-red-400 shrink-0" />
                        : o.ownerId?.isVerified
                          ? <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                          : null}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-200 leading-tight truncate max-w-[160px]">{o.ownerId?.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px]">{o.ownerId?.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Location count */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 text-sm font-medium">
                      <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                      {o.locations?.length ?? 0}
                    </span>
                  </td>

                  {/* Plan + status stacked */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide w-fit ${PLAN_COLORS[o.plan ?? ""] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {o.plan ?? "—"}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide w-fit ${STATUS_COLORS[o.planStatus ?? ""] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {(o.planStatus ?? "active").replace("_", " ")}
                      </span>
                    </div>
                  </td>

                  {/* Registered */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <CalendarDays size={12} className="shrink-0" />
                      {formatDate(o.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/users/${o.ownerId?._id}`}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="View owner profile"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        onClick={() => setEditing(o)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit organization"
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} organizations
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-500"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-500"
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
