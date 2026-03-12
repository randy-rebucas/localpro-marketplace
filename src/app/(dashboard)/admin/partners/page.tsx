"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Users,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Mail,
  Handshake,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  UserPlus,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Officer {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface PesoOffice {
  _id: string;
  officeName: string;
  municipality: string;
  region: string;
  contactEmail: string;
  headOfficerId: Officer;
  officerIds: Officer[];
  isActive: boolean;
  createdAt?: string;
}

interface PesoUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

type StatusFilter = "all" | "active" | "inactive";
type ModalMode = "create" | "edit";

/* ------------------------------------------------------------------ */
/*  Blank form state                                                    */
/* ------------------------------------------------------------------ */
const BLANK = {
  officeName: "",
  municipality: "",
  region: "",
  contactEmail: "",
  headOfficerId: "",
};

/* ------------------------------------------------------------------ */
/*  A tiny modal wrapper                                                */
/* ------------------------------------------------------------------ */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                       */
/* ------------------------------------------------------------------ */
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400";

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function AdminPartnersPage() {
  const [offices, setOffices] = useState<PesoOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* Modal state */
  const [modal, setModal] = useState<{ mode: ModalMode; office?: PesoOffice } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PesoOffice | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Form */
  const [form, setForm] = useState(BLANK);
  const [officerIds, setOfficerIds] = useState<Officer[]>([]);

  /* PESO user list for head officer picker */
  const [pesoUsers, setPesoUsers] = useState<PesoUser[]>([]);
  const [officerSearch, setOfficerSearch] = useState("");
  const [showOfficerDropdown, setShowOfficerDropdown] = useState(false);
  const officerDropRef = useRef<HTMLDivElement>(null);

  /* ---------------------------------------------------------------- */
  /*  Load all offices                                                  */
  /* ---------------------------------------------------------------- */
  const load = useCallback((filter: StatusFilter = statusFilter) => {
    setLoading(true);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/admin/partners${qs}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load");
        return r.json();
      })
      .then((d) => setOffices(d.offices ?? []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Load PESO users for dropdowns */
  useEffect(() => {
    fetch("/api/admin/users?role=peso&limit=200")
      .then(async (r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.users) setPesoUsers(d.users); })
      .catch(() => {});
  }, []);

  /* Close officer dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (officerDropRef.current && !officerDropRef.current.contains(e.target as Node)) {
        setShowOfficerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Derived: filtered display list                                   */
  /* ---------------------------------------------------------------- */
  const filtered = offices.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.officeName.toLowerCase().includes(q) ||
      o.municipality.toLowerCase().includes(q) ||
      o.region.toLowerCase().includes(q) ||
      o.contactEmail.toLowerCase().includes(q) ||
      o.headOfficerId?.name?.toLowerCase().includes(q)
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Filter tabs                                                       */
  /* ---------------------------------------------------------------- */
  function applyFilter(f: StatusFilter) {
    setStatusFilter(f);
    load(f);
  }

  /* ---------------------------------------------------------------- */
  /*  Toggle active                                                     */
  /* ---------------------------------------------------------------- */
  async function handleToggle(office: PesoOffice) {
    const next = !office.isActive;
    if (!confirm(`${next ? "Activate" : "Deactivate"} ${office.officeName}?`)) return;
    setTogglingId(office._id);
    try {
      const res = await fetch(`/api/admin/partners/${office._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      toast.success(`${office.officeName} ${next ? "activated" : "deactivated"}`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Open modal helpers                                                */
  /* ---------------------------------------------------------------- */
  function openCreate() {
    setForm(BLANK);
    setOfficerIds([]);
    setOfficerSearch("");
    setModal({ mode: "create" });
  }

  function openEdit(office: PesoOffice) {
    setForm({
      officeName: office.officeName,
      municipality: office.municipality,
      region: office.region,
      contactEmail: office.contactEmail,
      headOfficerId: office.headOfficerId?._id ?? "",
    });
    setOfficerIds(office.officerIds ?? []);
    setOfficerSearch("");
    setModal({ mode: "edit", office });
  }

  function closeModal() {
    if (!saving) setModal(null);
  }

  /* ---------------------------------------------------------------- */
  /*  Submit create / edit                                              */
  /* ---------------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.headOfficerId) {
      toast.error("Please select a Head Officer");
      return;
    }
    setSaving(true);
    try {
      const isEdit = modal?.mode === "edit";
      const url = isEdit ? `/api/admin/partners/${modal!.office!._id}` : "/api/admin/partners";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          officerIds: officerIds.map((o) => o._id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(isEdit ? "Office updated" : "Office created");
      setModal(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Delete                                                            */
  /* ---------------------------------------------------------------- */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/partners/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success(`${deleteTarget.officeName} deleted`);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Officer picker helpers                                            */
  /* ---------------------------------------------------------------- */
  const availableOfficers = pesoUsers.filter(
    (u) =>
      u._id !== form.headOfficerId &&
      !officerIds.find((o) => o._id === u._id) &&
      (officerSearch.trim() === "" ||
        u.name.toLowerCase().includes(officerSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(officerSearch.toLowerCase()))
  );

  function addOfficer(u: PesoUser) {
    setOfficerIds((prev) => [...prev, { _id: u._id, name: u.name, email: u.email }]);
    setOfficerSearch("");
    setShowOfficerDropdown(false);
  }

  function removeOfficer(id: string) {
    setOfficerIds((prev) => prev.filter((o) => o._id !== id));
  }

  /* ---------------------------------------------------------------- */
  /*  Head-officer display                                              */
  /* ---------------------------------------------------------------- */
  const selectedHead = pesoUsers.find((u) => u._id === form.headOfficerId);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  const FILTER_TABS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Handshake className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 dark:text-white">PESO Partners</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage all registered PESO offices and their officers.</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Office
          </button>
        </div>

        {/* ── Summary stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Offices", value: offices.length,                          icon: Building2,  bg: "bg-blue-50 dark:bg-blue-900/30",    ring: "ring-blue-100 dark:ring-blue-800",    color: "text-blue-600 dark:text-blue-400"    },
            { label: "Active",        value: offices.filter((o) => o.isActive).length,  icon: ToggleRight, bg: "bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-100 dark:ring-emerald-800", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Inactive",      value: offices.filter((o) => !o.isActive).length, icon: ToggleLeft,  bg: "bg-slate-100 dark:bg-slate-700",     ring: "ring-slate-100 dark:ring-slate-700",   color: "text-slate-400 dark:text-slate-500"  },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center gap-3 shadow-sm">
              <div className={`${stat.bg} ring-4 ${stat.ring} p-2.5 rounded-xl flex-shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + Filters ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search offices, locations, officers…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 shadow-sm"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => applyFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === tab.value
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="space-y-px animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              {search ? "No offices match your search." : "No PESO offices found."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((office) => (
                <li
                  key={office._id}
                  className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  {/* Left — office info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{office.officeName}</p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                            office.isActive
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {office.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {office.municipality}, {office.region}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Mail className="h-3 w-3" />
                          {office.contactEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                          <ShieldCheck className="h-3 w-3" />
                          {office.headOfficerId?.name ?? "—"}
                          <span className="text-slate-400 font-normal">(Head)</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Users className="h-3 w-3" />
                          {office.officerIds?.length ?? 0} staff officer
                          {office.officerIds?.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right — actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(office)}
                      title="Edit office"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => handleToggle(office)}
                      disabled={togglingId === office._id}
                      title={office.isActive ? "Deactivate" : "Activate"}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        office.isActive
                          ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                      }`}
                    >
                      {office.isActive ? (
                        <><ToggleRight className="h-3.5 w-3.5" /><span className="hidden sm:inline">Deactivate</span></>
                      ) : (
                        <><ToggleLeft className="h-3.5 w-3.5" /><span className="hidden sm:inline">Activate</span></>
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteTarget(office)}
                      title="Delete office"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Create / Edit Modal                                               */}
      {/* ================================================================ */}
      {modal && (
        <Modal
          title={modal.mode === "create" ? "Add PESO Office" : "Edit PESO Office"}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Office Name" required>
              <input
                type="text"
                value={form.officeName}
                onChange={(e) => setForm((p) => ({ ...p, officeName: e.target.value }))}
                placeholder="e.g. PESO Naga City"
                className={inputCls}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Municipality / City" required>
                <input
                  type="text"
                  value={form.municipality}
                  onChange={(e) => setForm((p) => ({ ...p, municipality: e.target.value }))}
                  placeholder="e.g. Naga City"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Region" required>
                <input
                  type="text"
                  value={form.region}
                  onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                  placeholder="e.g. Region V"
                  className={inputCls}
                  required
                />
              </Field>
            </div>

            <Field label="Contact Email" required>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="office@peso.gov.ph"
                className={inputCls}
                required
              />
            </Field>

            {/* Head Officer picker */}
            <Field label="Head Officer" required>
              <select
                value={form.headOfficerId}
                onChange={(e) => setForm((p) => ({ ...p, headOfficerId: e.target.value }))}
                className={inputCls}
                required
              >
                <option value="">— Select a PESO user —</option>
                {pesoUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              {selectedHead && (
                <p className="text-xs text-slate-400 mt-1">
                  <ShieldCheck className="inline h-3 w-3 mr-0.5 text-blue-500" />
                  {selectedHead.email}
                </p>
              )}
            </Field>

            {/* Staff Officers */}
            <Field label="Staff Officers">
              {/* Current officer chips */}
              {officerIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {officerIds.map((o) => (
                    <span
                      key={o._id}
                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1"
                    >
                      {o.name}
                      <button
                        type="button"
                        onClick={() => removeOfficer(o._id)}
                        className="text-blue-400 hover:text-blue-700 leading-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add officer dropdown */}
              <div className="relative" ref={officerDropRef}>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 cursor-text"
                  onClick={() => setShowOfficerDropdown(true)}
                >
                  <UserPlus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={officerSearch}
                    onChange={(e) => { setOfficerSearch(e.target.value); setShowOfficerDropdown(true); }}
                    onFocus={() => setShowOfficerDropdown(true)}
                    placeholder="Search and add officers…"
                    className="text-sm bg-transparent outline-none w-full placeholder:text-slate-400"
                  />
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </div>
                {showOfficerDropdown && availableOfficers.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                    {availableOfficers.slice(0, 20).map((u) => (
                      <li key={u._id}>
                        <button
                          type="button"
                          onClick={() => addOfficer(u)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                        >
                          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showOfficerDropdown && availableOfficers.length === 0 && officerSearch && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs text-slate-400">
                    No matching PESO users found.
                  </div>
                )}
              </div>
            </Field>

            {/* Footer actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : null}
                {modal.mode === "create" ? "Create Office" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* Delete Confirm Dialog                                             */}
      {/* ================================================================ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-base">Delete Office?</p>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold">{deleteTarget.officeName}</span> will be permanently removed.
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
