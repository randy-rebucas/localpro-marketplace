"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Wrench, Plus, Pencil, Trash2, X, Save, RefreshCw, Building2, Search, AlertCircle, Lock, ArrowUpRight } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { EQUIPMENT_LIMITS, PLAN_LABELS, PLAN_UPGRADE_NEXT, isAtEquipmentLimit, getEquipmentLimit } from "@/lib/businessPlan";
import { useTranslations } from "next-intl";
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

interface Agency {
  _id: string;
  plan: "starter" | "growth" | "pro" | "enterprise";
}

const EMPTY_FORM = { name: "", type: "", serialNo: "", status: "available" as EqStatus, notes: "" };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<EqStatus, string> = {
  available:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_use:      "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  retired:     "bg-slate-100 text-slate-500 border-slate-200",
};

const EQ_TYPE_KEYS = ["Vehicle", "Tool", "Device", "Safety Gear", "Cleaning Equipment", "Machinery", "Other"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EquipmentClient() {
  const t = useTranslations("providerPages");

  const STATUS_LABELS: Record<EqStatus, string> = {
    available:   t("provEquip_statusAvailable"),
    in_use:      t("provEquip_statusInUse"),
    maintenance: t("provEquip_statusMaintenance"),
    retired:     t("provEquip_statusRetired"),
  };

  const [agency, setAgency]         = useState<Agency | null>(null);
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
      const agencyData = await fetchClient<{ agency: Agency | null }>("/api/provider/agency/profile");
      if (agencyData.agency) setAgency(agencyData.agency);
      const data = await fetchClient<{ equipment: Equipment[]; hasAgency: boolean }>("/api/provider/agency/equipment");
      setItems(data.equipment);
      setHasAgency(data.hasAgency);
    } catch {
      setLoadError(true);
      toast.error(t("provEquip_errLoad"));
      setHasAgency(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    const limit = agency ? EQUIPMENT_LIMITS[agency.plan] : Infinity;
    const atLimit = agency ? isAtEquipmentLimit(agency.plan, items.length) : false;
    const planLabel = agency ? PLAN_LABELS[agency.plan] : "";

    if (atLimit) {
      toast.error(t("provEquip_errPlanLimit", { plan: planLabel, limit: String(limit) }));
      return;
    }
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
    if (!form.name.trim()) { toast.error(t("provEquip_errNameRequired")); return; }
    setSaving(true);
    try {
      if (editing) {
        await fetchClient("/api/provider/agency/equipment", {
          method: "PATCH",
          body: JSON.stringify({ ...form, equipmentId: editing._id }),
        });
        toast.success(t("provEquip_successUpdated"));
      } else {
        await fetchClient("/api/provider/agency/equipment", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success(t("provEquip_successAdded"));
      }
      closeForm();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provEquip_errSave"));
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
      toast.error(t("provEquip_errUpdateStatus"));
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null);
    try {
      await fetchClient(`/api/provider/agency/equipment?equipmentId=${id}`, { method: "DELETE" });
      toast.success(t("provEquip_successRemoved"));
      await load();
    } catch {
      toast.error(t("provEquip_errDelete"));
    }
  }

  const statusCounts = (["available", "in_use", "maintenance", "retired"] as EqStatus[]).map((s) => ({
    status: s, count: items.filter((i) => i.status === s).length,
  }));

  // Plan limit calculations
  const equipmentLimit = agency ? EQUIPMENT_LIMITS[agency.plan] : Infinity;
  const atLimit = agency ? isAtEquipmentLimit(agency.plan, items.length) : false;
  const planLabel = agency ? PLAN_LABELS[agency.plan] : "";
  const nextPlan = agency ? PLAN_UPGRADE_NEXT[agency.plan] : undefined;

  const filtered = items
    .filter((i) => !filterStatus || i.status === filterStatus)
    .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.type.toLowerCase().includes(search.toLowerCase()));

  // ── Error screen ──────────────────────────────────────────────────────────
  if (loadError && !items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">{t("provEquip_errorHeading")}</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">{t("provEquip_btnTryAgain")}</button>
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
        <p className="font-semibold text-slate-700">{t("provEquip_noAgencyHeading")}</p>
        <p className="text-sm text-slate-400">
          {t("provEquip_noAgencyDesc")}
        </p>
        <Link href="/provider/business" className="btn-primary mt-2">
          {t("provEquip_btnCreateAgency")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("provEquip_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{items.length !== 1 ? t("provEquip_itemCountPlural", { count: items.length }) : t("provEquip_itemCount", { count: items.length })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Plan quota badge */}
          {agency && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              atLimit
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}>
              <Wrench className="h-3 w-3" />
              {items.length} / {equipmentLimit === Infinity ? "\u221e" : equipmentLimit} &middot; {planLabel}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openNew}
            disabled={atLimit}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {t("provEquip_btnAddEquipment")}
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
            placeholder={t("provEquip_searchPlaceholder")}
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

      {/* Plan limit upgrade banner */}
      {atLimit && !showForm && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-amber-800">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {equipmentLimit === 1
                ? t("provEquip_bannerAtLimit", { plan: planLabel, limit: String(equipmentLimit) })
                : t("provEquip_bannerAtLimitPlural", { plan: planLabel, limit: String(equipmentLimit) })}
              {nextPlan && ` ${t("provEquip_bannerUpgrade", { plan: PLAN_LABELS[nextPlan] })}`}
            </span>
          </div>
          {nextPlan && (
            <a
              href="/provider/business/plan"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              {t("provEquip_btnUpgrade")} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div ref={formRef} id="eq-form" className="bg-white border border-primary/20 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{editing ? t("provEquip_formEditTitle") : t("provEquip_formAddTitle")}</h2>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provEquip_labelName")}</label>
              <input className="input w-full" placeholder={t("provEquip_placeholderName")} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provEquip_labelType")}</label>
              <select className="input w-full" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="">{t("provEquip_selectType")}</option>
                {EQ_TYPE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provEquip_labelSerial")}</label>
              <input className="input w-full" placeholder={t("provEquip_placeholderSerial")} value={form.serialNo} onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provEquip_labelStatus")}</label>
              <select className="input w-full" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EqStatus }))}>
                {(Object.keys(STATUS_LABELS) as EqStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t("provEquip_labelNotes")}</label>
                <span className={`text-[10px] tabular-nums ${form.notes.length > 480 ? "text-red-400" : "text-slate-300"}`}>{form.notes.length}/500</span>
              </div>
              <textarea className="input w-full resize-none" rows={2} maxLength={500} placeholder={t("provEquip_placeholderNotes")} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? t("provEquip_btnSaving") : editing ? t("provEquip_btnUpdate") : t("provEquip_btnAdd")}
            </button>
            <button onClick={closeForm} className="btn-secondary">{t("provEquip_btnCancel")}</button>
          </div>
        </div>
      )}

      {/* ── Equipment List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 gap-3 text-center">
          <Wrench className="h-9 w-9 text-slate-300" />
          <p className="text-slate-500 text-sm">
            {filterStatus || search
              ? t("provEquip_emptyFiltered")
              : t("provEquip_emptyDefault")}
          </p>
          {filterStatus || search ? (
            <button onClick={() => { setFilterStatus(""); setSearch(""); }} className="text-sm text-primary hover:underline">{t("provEquip_btnClearFilters")}</button>
          ) : (
            <button onClick={openNew} className="btn-primary mt-1"><Plus className="h-4 w-4 mr-1.5" /> {t("provEquip_btnAddEquipment")}</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">{t("provEquip_thName")}</th>
                  <th className="text-left px-5 py-3">{t("provEquip_thType")}</th>
                  <th className="text-left px-5 py-3">{t("provEquip_thSerial")}</th>
                  <th className="text-center px-5 py-3">{t("provEquip_thStatus")}</th>
                  <th className="text-right px-5 py-3">{t("provEquip_thActions")}</th>
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
                            <button onClick={() => handleDelete(item._id)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">{t("provEquip_btnRemove")}</button>
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
