"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Wallet, Bell, Users, X, BarChart2, Briefcase, Star,
  ChevronRight, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization, IBusinessLocation, IBusinessMember } from "@/types";
import { formatCurrency } from "@/lib/utils";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import toast from "react-hot-toast";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  "Cleaning", "Repairs", "Security", "Maintenance", "Landscaping",
  "Plumbing", "Electrical", "Pest Control", "Moving", "IT Support",
  "Catering", "Logistics", "Painting", "Air Conditioning", "Other",
];

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  assigned:    "bg-violet-100 text-violet-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-red-100 text-red-600",
  disputed:    "bg-orange-100 text-orange-700",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgApiResponse { org: IBusinessOrganization | null }

interface LocationDetail {
  location: IBusinessLocation;
  kpi: { budgetUsedPct: number; monthlySpend: number; activeJobs: number; completedJobs: number; avgRating: number };
  recentJobs: { id: string; title: string; category: string; status: string; createdAt: string; providerName: string | null; providerAvatar: string | null }[];
  topProviders: { id: string; name: string; avatar: string | null; totalJobs: number; completedJobs: number; avgRating: number }[];
}

const EMPTY_FORM = {
  label: "", address: "", monthlyBudget: 0, alertThreshold: 80,
  managerId: "" as string,
  allowedCategories: [] as string[],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-700 tabular-nums">{value > 0 ? value.toFixed(1) : "—"}</span>
    </div>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LocationsClient() {
  const [org, setOrg]           = useState<IBusinessOrganization | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  // Members for manager assignment
  const [members, setMembers]         = useState<IBusinessMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Detail drawer
  const [detailLocId, setDetailLocId]   = useState<string | null>(null);
  const [detail, setDetail]             = useState<LocationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<OrgApiResponse>("/api/business/org");
      setOrg(data.org);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load members on mount so manager names appear on location cards
  useEffect(() => {
    if (!org) return;
    const oid = org._id.toString();
    setMembersLoading(true);
    fetchClient<{ members: IBusinessMember[] }>(`/api/business/members?orgId=${oid}`)
      .then((d) => setMembers(d.members))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?._id?.toString()]);

  // Load detail when drawer opens
  useEffect(() => {
    if (!detailLocId || !org) return;
    const oid = org._id.toString();
    setDetailLoading(true);
    setDetail(null);
    fetchClient<LocationDetail>(`/api/business/locations/detail?orgId=${oid}&locationId=${detailLocId}`)
      .then((d) => setDetail(d))
      .catch(() => toast.error("Failed to load branch detail."))
      .finally(() => setDetailLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailLocId, org?._id?.toString()]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(loc: IBusinessLocation) {
    setEditingId(loc._id.toString());
    setForm({
      label: loc.label,
      address: loc.address,
      monthlyBudget: loc.monthlyBudget,
      alertThreshold: loc.alertThreshold ?? 80,
      managerId: loc.managerId ? String(loc.managerId) : "",
      allowedCategories: loc.allowedCategories ?? [],
    });
    setShowForm(true);
  }

  function openDetail(locId: string) {
    setDetailLocId(locId);
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      allowedCategories: f.allowedCategories.includes(cat)
        ? f.allowedCategories.filter((c) => c !== cat)
        : [...f.allowedCategories, cat],
    }));
  }

  async function handleSave() {
    if (!org) return;
    if (!form.label.trim() || !form.address.trim()) {
      toast.error("Label and address are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        orgId: org._id,
        label: form.label,
        address: form.address,
        monthlyBudget: form.monthlyBudget,
        alertThreshold: form.alertThreshold,
        managerId: form.managerId || null,
        allowedCategories: form.allowedCategories,
        ...(editingId ? { locationId: editingId } : {}),
      };
      const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/locations", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setOrg(data.org);
      toast.success(editingId ? "Location updated." : "Location added.");
      setShowForm(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save location.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(loc: IBusinessLocation) {
    if (!org) return;
    try {
      const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/locations", {
        method: "PATCH",
        body: JSON.stringify({ orgId: org._id, locationId: loc._id, isActive: !loc.isActive }),
      });
      setOrg(data.org);
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function handleDelete(locId: string) {
    if (!org) return;
    setConfirmDeleteId(null);
    try {
      const data = await fetchClient<{ org: IBusinessOrganization }>(
        `/api/business/locations?orgId=${org._id}&locationId=${locId}`,
        { method: "DELETE" }
      );
      setOrg(data.org);
      if (detailLocId === locId) setDetailLocId(null);
      toast.success("Location removed.");
    } catch {
      toast.error("Failed to remove location.");
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-40 bg-slate-200 rounded-lg" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <MapPin className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No business profile found.{" "}
          <a href="/client/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  const activeCount   = org.locations.filter((l) => l.isActive).length;
  const inactiveCount = org.locations.length - activeCount;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Locations</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {org.name}{org.locations.length > 0 && ` · ${activeCount} active${inactiveCount > 0 ? `, ${inactiveCount} inactive` : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={showForm ? () => setShowForm(false) : openAdd}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add Location"}
        </button>
      </div>

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-800">{editingId ? "Edit Location" : "New Location"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Label and address are required.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Label */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Label *</label>
              <input
                className="input w-full"
                placeholder="e.g. Main Branch – Cebu"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            {/* Monthly Budget */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Monthly Budget (PHP)</label>
              <input
                className="input w-full"
                type="number" min={0}
                value={form.monthlyBudget}
                onChange={(e) => setForm((f) => ({ ...f, monthlyBudget: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            {/* Alert Threshold */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Alert Threshold (%)</label>
              <input
                className="input w-full"
                type="number" min={1} max={99}
                value={form.alertThreshold}
                onChange={(e) => setForm((f) => ({ ...f, alertThreshold: parseInt(e.target.value, 10) || 80 }))}
              />
              <p className="text-[11px] text-slate-400 mt-1">Notify when spend exceeds this % of budget.</p>
            </div>

            {/* Branch Manager */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Branch Manager</label>
              {membersLoading ? (
                <div className="input w-full animate-pulse bg-slate-100" />
              ) : (
                <select
                  className="input w-full"
                  value={form.managerId}
                  onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
                >
                  <option value="">— No manager assigned —</option>
                  {members.filter((m) => m.isActive).map((m) => {
                    const user = m.userId as { _id?: string; name?: string } | string;
                    const uid  = typeof user === "string" ? user : (user?._id ?? m.userId.toString());
                    const name = typeof user === "object" ? (user?.name ?? "Member") : "Member";
                    return <option key={uid} value={uid}>{name} ({m.role})</option>;
                  })}
                </select>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Address *</label>
              <LocationAutocomplete
                value={form.address}
                onChange={(address) => setForm((f) => ({ ...f, address }))}
                placeholder="Start typing a full address…"
              />
            </div>

            {/* Allowed Service Categories */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Allowed Service Categories
                <span className="ml-1.5 text-slate-300 normal-case font-normal">(leave empty = all)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => {
                  const active = form.allowedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Location"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Location list ── */}
      {org.locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 gap-5 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-slate-400" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <p className="text-sm font-semibold text-slate-700">No locations yet</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add your first business location to start tracking budgets, assigning managers, and monitoring jobs per site.
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add your first location
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {org.locations.map((loc) => {
            const threshold  = loc.alertThreshold ?? 80;
            const managerName = (() => {
              if (!loc.managerId) return null;
              const mid = String(loc.managerId);
              const m = members.find((mem) => {
                const uid = typeof mem.userId === "object" && mem.userId !== null
                  ? (mem.userId as { _id?: string })?._id ?? String(mem.userId)
                  : String(mem.userId);
                return uid === mid;
              });
              if (!m) return "Assigned";
              const u = m.userId as { name?: string } | string;
              return typeof u === "object" ? u?.name ?? "Manager" : "Manager";
            })();
            const cats = loc.allowedCategories ?? [];
            const isDetailOpen = detailLocId === loc._id.toString();

            return (
              <div
                key={loc._id.toString()}
                className={`bg-white rounded-2xl border transition-all ${
                  loc.isActive ? "border-slate-200" : "border-slate-100 opacity-60"
                } ${isDetailOpen ? "ring-2 ring-primary/20" : ""}`}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-4">
                  <div className={`p-2.5 rounded-xl ring-4 flex-shrink-0 mt-0.5 ${
                    loc.isActive ? "bg-primary/10 ring-primary/10 text-primary" : "bg-slate-100 ring-slate-100 text-slate-400"
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{loc.label}</span>
                      {loc.isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">Active</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">Inactive</span>
                      )}
                      {managerName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />{managerName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">{loc.address}</p>

                    {/* Budget + Alert */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Wallet className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(loc.monthlyBudget)}</span>
                        <span className="text-slate-400">/ mo</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Bell className="h-3.5 w-3.5 text-slate-400" />
                        <span>Alert at </span>
                        <span className="font-semibold text-slate-700">{threshold}%</span>
                      </div>
                    </div>

                    {/* Allowed categories */}
                    {cats.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {cats.slice(0, 5).map((c) => (
                          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{c}</span>
                        ))}
                        {cats.length > 5 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">+{cats.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => isDetailOpen ? setDetailLocId(null) : openDetail(loc._id.toString())}
                      title="Branch detail"
                      className={`p-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                        isDetailOpen ? "bg-primary/10 text-primary" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <BarChart2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(loc)}
                      title={loc.isActive ? "Deactivate" : "Activate"}
                      className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      {loc.isActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                    </button>
                    <button
                      onClick={() => openEdit(loc)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {confirmDeleteId === loc._id.toString() ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(loc._id.toString())}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(loc._id.toString())}
                        className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Branch Detail Panel ── */}
                {isDetailOpen && (
                  <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50/60 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-slate-400" />
                        <h3 className="font-semibold text-slate-800 text-sm">Branch Detail</h3>
                      </div>
                      <button onClick={() => setDetailLocId(null)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {detailLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
                        </div>
                        <div className="h-32 bg-slate-200 rounded-xl" />
                      </div>
                    ) : detail ? (
                      <div className="space-y-5">
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {[
                            { label: "Budget Used", value: `${detail.kpi.budgetUsedPct}%`, icon: Wallet, color: detail.kpi.budgetUsedPct >= 90 ? "text-red-600" : detail.kpi.budgetUsedPct >= 70 ? "text-amber-600" : "text-emerald-600" },
                            { label: "Month Spend", value: formatCurrency(detail.kpi.monthlySpend), icon: Wallet, color: "text-slate-700" },
                            { label: "Active Jobs", value: detail.kpi.activeJobs, icon: Briefcase, color: "text-blue-600" },
                            { label: "Completed", value: detail.kpi.completedJobs, icon: CheckCircle2, color: "text-emerald-600" },
                            { label: "Perf. Score", value: detail.kpi.avgRating > 0 ? detail.kpi.avgRating.toFixed(1) : "—", icon: Star, color: "text-amber-500" },
                          ].map((c) => (
                            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                              <p className={`text-lg font-bold leading-tight ${c.color}`}>{c.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Budget utilization bar */}
                        {loc.monthlyBudget > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <p className="font-medium text-slate-600">Budget Utilization</p>
                              <p className={`font-bold tabular-nums ${detail.kpi.budgetUsedPct >= 90 ? "text-red-600" : detail.kpi.budgetUsedPct >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
                                {detail.kpi.budgetUsedPct}%
                              </p>
                            </div>
                            <PctBar
                              pct={detail.kpi.budgetUsedPct}
                              color={detail.kpi.budgetUsedPct >= 90 ? "#ef4444" : detail.kpi.budgetUsedPct >= 70 ? "#f59e0b" : "#10b981"}
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] text-slate-400">{formatCurrency(detail.kpi.monthlySpend)} spent</p>
                              <p className="text-[11px] text-slate-400">{formatCurrency(loc.monthlyBudget)} budget</p>
                            </div>
                            {detail.kpi.budgetUsedPct >= (threshold) && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                Budget threshold reached — consider reviewing spend.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Two-column: Recent Jobs + Top Providers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                          {/* Recent Jobs */}
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                              <p className="text-xs font-semibold text-slate-700">Job History</p>
                            </div>
                            {detail.recentJobs.length === 0 ? (
                              <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                                <Briefcase className="h-6 w-6 text-slate-300" />
                                <p className="text-xs text-slate-400">No jobs yet</p>
                              </div>
                            ) : (
                              <ul className="divide-y divide-slate-50">
                                {detail.recentJobs.map((job) => (
                                  <li key={job.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-800 truncate">{job.title}</p>
                                      <p className="text-[11px] text-slate-400">{job.category}</p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${STATUS_COLORS[job.status] ?? "bg-slate-100 text-slate-500"}`}>
                                      {job.status.replace("_", " ")}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Provider Usage History */}
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <p className="text-xs font-semibold text-slate-700">Provider Usage History</p>
                            </div>
                            {detail.topProviders.length === 0 ? (
                              <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                                <Users className="h-6 w-6 text-slate-300" />
                                <p className="text-xs text-slate-400">No providers yet</p>
                              </div>
                            ) : (
                              <ul className="divide-y divide-slate-50">
                                {detail.topProviders.map((p, i) => (
                                  <li key={p.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                    <span className="text-[10px] font-bold text-slate-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                                    {p.avatar ? (
                                      <Image src={p.avatar} alt={p.name} width={22} height={22} className="w-5.5 h-5.5 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="w-5.5 h-5.5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-primary">
                                        {p.name[0]}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                                      <StarRating value={p.avgRating} />
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <p className="text-xs font-bold text-slate-900 tabular-nums">{p.totalJobs}</p>
                                      <p className="text-[10px] text-slate-400">jobs</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
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
