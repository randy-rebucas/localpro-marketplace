"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Wrench, Plus, Pencil, Trash2, X, Save, RefreshCw, Building2, Search, AlertCircle } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type EqStatus = "available" | "in_use" | "maintenance" | "retired";

interface Equipment {
  _id: string;
  name: string;
  type: string;
  serialNo: string;
  status: EqStatus;
  notes: string;
}

const EMPTY_FORM = { name: "", type: "", serialNo: "", status: "available" as EqStatus, notes: "" };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<EqStatus, string> = {
  available:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_use:      "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  retired:     "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABELS: Record<EqStatus, string> = {
  available:   "Available",
  in_use:      "In Use",
  maintenance: "Maintenance",
  retired:     "Retired",
};

const EQ_TYPES = ["Vehicle", "Tool", "Device", "Safety Gear", "Cleaning Equipment", "Machinery", "Other"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EquipmentClient() {
  const [items, setItems]           = useState<Equipment[]>([]);
  const [hasAgency, setHasAgency]   = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Equipment | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus]   = useState<EqStatus | "">("")
  const [search, setSearch]               = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchClient<{ equipment: Equipment[]; hasAgency: boolean }>("/api/provider/agency/equipment");
      setItems(data.equipment);
      setHasAgency(data.hasAgency);
    } catch {
      setLoadError(true);
      toast.error("Failed to load equipment.");
      setHasAgency(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setForm({ name: item.name, type: item.type, serialNo: item.serialNo, status: item.status, notes: item.notes });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      if (editing) {
        await fetchClient("/api/provider/agency/equipment", {
          method: "PATCH",
          body: JSON.stringify({ ...form, equipmentId: editing._id }),
        });
        toast.success("Equipment updated.");
      } else {
        await fetchClient("/api/provider/agency/equipment", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success("Equipment added.");
      }
      closeForm();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(item: Equipment, status: EqStatus) {
    try {
      await fetchClient("/api/provider/agency/equipment", {
        method: "PATCH",
        body: JSON.stringify({ equipmentId: item._id, status }),
      });
      await load();
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null);
    try {
      await fetchClient(`/api/provider/agency/equipment?equipmentId=${id}`, { method: "DELETE" });
      toast.success("Equipment removed.");
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  }

  const statusCounts = (["available", "in_use", "maintenance", "retired"] as EqStatus[]).map((s) => ({
    status: s, count: items.filter((i) => i.status === s).length,
  }));

  const filtered = items
    .filter((i) => !filterStatus || i.status === filterStatus)
    .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.type.toLowerCase().includes(search.toLowerCase()));

  // ── Error screen ──────────────────────────────────────────────────────────
  if (loadError && !items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">Failed to load equipment</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading && !items.length) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── No agency profile ─────────────────────────────────────────────────────
  if (hasAgency === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Building2 className="h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-700">No agency profile found</p>
        <p className="text-sm text-slate-400">
          You need to create an agency profile before managing equipment.
        </p>
        <Link href="/provider/business" className="btn-primary mt-2">
          Create Agency Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Equipment</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{items.length} item{items.length !== 1 ? "s" : ""} in inventory</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Equipment
          </button>
        </div>
      </div>

      {/* ── Status Summary + Search ── */}
      {items.length > 0 && (
        <div className="space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or type…"
            className="input pl-8 py-1.5 text-sm w-full"
          />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {statusCounts.map(({ status, count }) => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
              className={`bg-white border rounded-2xl p-3 text-center transition-all ${filterStatus === status ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"}`}
            >
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </button>
          ))}
        </div>        </div>      )}

      {/* ── Form ── */}
      {showForm && (
        <div ref={formRef} id="eq-form" className="bg-white border border-primary/20 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{editing ? "Edit Equipment" : "Add Equipment"}</h2>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Name *</label>
              <input className="input w-full" placeholder="e.g. Steam Pressure Washer" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Type</label>
              <select className="input w-full" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="">Select type…</option>
                {EQ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Serial / ID No.</label>
              <input className="input w-full" placeholder="Optional" value={form.serialNo} onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select className="input w-full" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EqStatus }))}>
                {(Object.keys(STATUS_LABELS) as EqStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Notes</label>
                <span className={`text-[10px] tabular-nums ${form.notes.length > 480 ? "text-red-400" : "text-slate-300"}`}>{form.notes.length}/500</span>
              </div>
              <textarea className="input w-full resize-none" rows={2} maxLength={500} placeholder="Optional notes…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : editing ? "Update" : "Add"}
            </button>
            <button onClick={closeForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Equipment List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 gap-3 text-center">
          <Wrench className="h-9 w-9 text-slate-300" />
          <p className="text-slate-500 text-sm">
            {filterStatus || search
              ? "No equipment matches your filters."
              : "No equipment logged yet. Track tools, vehicles, and devices here."}
          </p>
          {filterStatus || search ? (
            <button onClick={() => { setFilterStatus(""); setSearch(""); }} className="text-sm text-primary hover:underline">Clear filters</button>
          ) : (
            <button onClick={openNew} className="btn-primary mt-1"><Plus className="h-4 w-4 mr-1.5" /> Add Equipment</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Serial</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      {item.notes && <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{item.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{item.type || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{item.serialNo || "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value as EqStatus)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer appearance-none text-center ${STATUS_STYLES[item.status]}`}
                      >
                        {(Object.keys(STATUS_LABELS) as EqStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmDelete === item._id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(item._id)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">Remove</button>
                            <button onClick={() => setConfirmDelete(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
