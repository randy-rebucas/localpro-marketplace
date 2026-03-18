"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Layers, Plus, Pencil, Trash2, X, Save, RefreshCw,
  ToggleLeft, ToggleRight, Search, Tag, Clock, DollarSign,
  CheckCircle2, XCircle, Copy, Lock, ArrowUpRight, Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_LIMITS, PLAN_LABELS, PLAN_UPGRADE_NEXT, isAtServiceLimit, getServiceLimit } from "@/lib/businessPlan";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
  isActive: boolean;
}

interface Agency {
  _id: string;
  plan: "starter" | "growth" | "pro" | "enterprise";
}

interface FormState {
  title: string;
  description: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
  isActive: boolean;
}

type FilterStatus = "all" | "active" | "inactive";
type SortKey = "title" | "price" | "category";

const EMPTY_FORM: FormState = {
  title: "", description: "", category: "", minPrice: 0, maxPrice: 0, duration: "", isActive: true,
};

const SUGGESTED_CATEGORIES = [
  "Cleaning", "Plumbing", "Electrical", "Repairs", "Carpentry",
  "Painting", "Landscaping", "Moving", "Security", "Catering",
  "IT Support", "Design", "Consulting", "Delivery", "Other",
];

const SUGGESTED_DURATIONS = [
  "30 minutes", "1 hour", "1–2 hours", "2–3 hours", "3–4 hours",
  "Half day (4 hrs)", "Full day (8 hrs)", "2 days", "Per project", "Varies",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServicesClient() {
  const t = useTranslations("providerPages");

  const [agency, setAgency]                 = useState<Agency | null>(null);
  const [services, setServices]             = useState<Service[]>([]);
  const [loading, setLoading]               = useState(true);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [editing, setEditing]               = useState<Service | null>(null);
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError]           = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null);
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortKey, setSortKey]               = useState<SortKey>("title");

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const agencyData = await fetchClient<{ agency: Agency | null }>("/api/provider/agency/profile");
      if (agencyData.agency) setAgency(agencyData.agency);
      const data = await fetchClient<{ services: Service[] }>("/api/provider/agency/services");
      setServices(data.services);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("provServices_errLoadFailed");
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openNew() {
    if (atLimit) {
      toast.error(t("provServices_toastAtLimit", { plan: planLabel, count: serviceLimit }));
      return;
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
    setTimeout(() => document.getElementById("svc-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openEdit(svc: Service) {
    setEditing(svc);
    setForm({
      title: svc.title, description: svc.description, category: svc.category,
      minPrice: svc.minPrice, maxPrice: svc.maxPrice, duration: svc.duration, isActive: svc.isActive,
    });
    setFormError(null);
    setShowForm(true);
    setTimeout(() => document.getElementById("svc-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openDuplicate(svc: Service) {
    if (atLimit) {
      toast.error(t("provServices_toastAtLimit", { plan: planLabel, count: serviceLimit }));
      return;
    }
    setEditing(null);
    setForm({
      title: `${svc.title} ${t("provServices_copySuffix")}`,
      description: svc.description,
      category: svc.category,
      minPrice: svc.minPrice,
      maxPrice: svc.maxPrice,
      duration: svc.duration,
      isActive: false,
    });
    setFormError(null);
    setShowForm(true);
    setTimeout(() => document.getElementById("svc-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function validateForm(): string | null {
    if (!form.title.trim())           return t("provServices_validTitle");
    if (form.title.trim().length < 2) return t("provServices_validTitleLen");
    if (form.minPrice < 0)            return t("provServices_validMinNeg");
    if (form.maxPrice < 0)            return t("provServices_validMaxNeg");
    if (form.maxPrice > 0 && form.minPrice > form.maxPrice)
      return t("provServices_validMinMax");
    return null;
  }

  async function handleSubmit() {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setSaving(true);
    try {
      if (editing) {
        await fetchClient("/api/provider/agency/services", {
          method: "PATCH",
          body: JSON.stringify({ ...form, serviceId: editing._id }),
        });
        toast.success(t("provServices_toastUpdated"));
      } else {
        await fetchClient("/api/provider/agency/services", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success(t("provServices_toastAdded"));
      }
      closeForm();
      await load(); // Re-sync from DB to confirm persistence
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provServices_errSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(svc: Service) {
    const next = !svc.isActive;
    // Optimistic update for instant feedback
    setServices((prev) => prev.map((s) => s._id === svc._id ? { ...s, isActive: next } : s));
    try {
      await fetchClient("/api/provider/agency/services", {
        method: "PATCH",
        body: JSON.stringify({ serviceId: svc._id, isActive: next }),
      });
      await load(); // Re-sync from DB
    } catch {
      // Rollback on failure
      setServices((prev) => prev.map((s) => s._id === svc._id ? { ...s, isActive: svc.isActive } : s));
      toast.error(t("provServices_errToggle"));
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null);
    const snapshot = services;
    // Optimistic remove for instant feedback
    setServices((prev) => prev.filter((s) => s._id !== id));
    try {
      await fetchClient(`/api/provider/agency/services?serviceId=${id}`, { method: "DELETE" });
      toast.success(t("provServices_toastRemoved"));
      await load(); // Re-sync from DB to confirm removal
    } catch {
      setServices(snapshot);
      toast.error(t("provServices_errDelete"));
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeCount   = services.filter((s) => s.isActive).length;
  const inactiveCount = services.length - activeCount;
  const categories    = Array.from(new Set(services.map((s) => s.category).filter(Boolean))).sort();
  const avgPrice      = services.length > 0
    ? Math.round(services.reduce((s, svc) => s + ((svc.minPrice + (svc.maxPrice || svc.minPrice)) / 2), 0) / services.length)
    : 0;

  // Plan limit calculations
  const serviceLimit = agency ? SERVICE_LIMITS[agency.plan] : Infinity;
  const atLimit = agency ? isAtServiceLimit(agency.plan, services.length) : false;
  const planLabel = agency ? PLAN_LABELS[agency.plan] : "";
  const nextPlan = agency ? PLAN_UPGRADE_NEXT[agency.plan] : undefined;

  const filtered = services
    .filter((s) => {
      if (filterStatus === "active"   && !s.isActive) return false;
      if (filterStatus === "inactive" &&  s.isActive) return false;
      if (filterCategory && s.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "price")    return a.minPrice - b.minPrice;
      if (sortKey === "category") return a.category.localeCompare(b.category);
      return a.title.localeCompare(b.title);
    });

  function priceLabel(svc: Service): string {
    if (svc.minPrice === 0 && svc.maxPrice === 0) return t("provServices_freeCustom");
    if (svc.minPrice === svc.maxPrice)             return formatCurrency(svc.minPrice);
    return `${formatCurrency(svc.minPrice)} – ${formatCurrency(svc.maxPrice)}`;
  }

  function clearFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterStatus("all");
  }

  const hasActiveFilters = search || filterCategory || filterStatus !== "all";

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-10 bg-slate-200 rounded-xl" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <XCircle className="h-10 w-10 text-red-300" />
        <p className="font-semibold text-slate-700">{t("provServices_errCouldNotLoad")}</p>
        <p className="text-sm text-slate-400">{loadError}</p>
        <button onClick={load} className="btn-primary mt-2 flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" /> {t("provServices_btnRetry")}
        </button>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("provServices_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {services.length} {t(services.length !== 1 ? "provServices_services" : "provServices_service")} &middot; {activeCount} {t("provServices_subActive")} &middot; {inactiveCount} {t("provServices_subInactive")}
            </p>
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
              <Layers className="h-3 w-3" />
              {services.length} / {serviceLimit === Infinity ? "\u221e" : serviceLimit} &middot; {planLabel}
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
            {atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {t("provServices_btnAddService")}
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      {services.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { status: "all",      label: t("provServices_kpiTotal"),    count: services.length, color: "text-slate-700" },
            { status: "active",   label: t("provServices_kpiActive"),   count: activeCount,     color: "text-emerald-600" },
            { status: "inactive", label: t("provServices_kpiInactive"), count: inactiveCount,   color: "text-slate-400" },
          ] as { status: FilterStatus; label: string; count: number; color: string }[]).map(({ status, label, count, color }) => {
            const isSelected = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(isSelected && status !== "all" ? "all" : status)}
                className={`bg-white border rounded-2xl p-4 text-center transition-all ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className={`text-xs font-semibold mt-0.5 ${color}`}>{label}</p>
              </button>
            );
          })}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{services.length > 0 ? formatCurrency(avgPrice) : "—"}</p>
            <p className="text-xs font-semibold mt-0.5 text-blue-600">{t("provServices_kpiAvgPrice")}</p>
          </div>
        </div>
      )}

      {/* Plan limit upgrade banner */}
      {atLimit && !showForm && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-amber-800">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              {t("provServices_planLimitReachedThe")} <strong>{planLabel}</strong> {t("provServices_planLimitOf")}{" "}
              <strong>{serviceLimit === Infinity ? "\u221e" : serviceLimit} {t(serviceLimit === 1 ? "provServices_service" : "provServices_services")}</strong>.
              {nextPlan && ` ${t("provServices_planLimitUpgrade", { plan: PLAN_LABELS[nextPlan] })}`}
            </span>
          </div>
          {nextPlan && (
            <a
              href="/provider/business/plan"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              {t("provServices_btnUpgrade")} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div id="svc-form" className="bg-white border border-primary/20 rounded-2xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{editing ? t("provServices_formEditTitle") : t("provServices_formNewTitle")}</h2>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provServices_fieldTitle")}</label>
              <input
                className="input w-full"
                placeholder={t("provServices_placeholderTitle")}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provServices_fieldDesc")}</label>
              <textarea
                className="input w-full resize-none"
                rows={3}
                maxLength={1000}
                placeholder={t("provServices_placeholderDesc")}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <p className="text-[10px] text-slate-400 text-right mt-0.5">{form.description.length}/1000</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provServices_fieldCategory")}</label>
              <input
                className="input w-full"
                list="svc-category-list"
                placeholder={t("provServices_placeholderCategory")}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
              <datalist id="svc-category-list">
                {SUGGESTED_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provServices_fieldDuration")}</label>
              <input
                className="input w-full"
                list="svc-duration-list"
                placeholder={t("provServices_placeholderDuration")}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              />
              <datalist id="svc-duration-list">
                {SUGGESTED_DURATIONS.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provServices_fieldMinPrice")}</label>
              <input
                className="input w-full"
                type="number"
                min={0}
                value={form.minPrice}
                onChange={(e) => setForm((f) => ({ ...f, minPrice: Number(e.target.value) }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provServices_fieldMaxPrice")}</label>
              <input
                className={`input w-full ${form.maxPrice > 0 && form.minPrice > form.maxPrice ? "border-red-300 focus:ring-red-200" : ""}`}
                type="number"
                min={0}
                value={form.maxPrice}
                onChange={(e) => setForm((f) => ({ ...f, maxPrice: Number(e.target.value) }))}
              />
              {form.maxPrice > 0 && form.minPrice > form.maxPrice && (
                <p className="text-xs text-red-500 mt-1">{t("provServices_maxPriceError")}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                {form.isActive
                  ? <ToggleRight className="h-5 w-5 text-primary" />
                  : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                <span>{form.isActive ? t("provServices_toggleActive") : t("provServices_toggleInactive")}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? t("provServices_btnSaving") : editing ? t("provServices_btnUpdate") : t("provServices_btnAddService")}
            </button>
            <button onClick={closeForm} className="btn-secondary">{t("provServices_btnCancel")}</button>
          </div>
        </div>
      )}

      {/* ── Filters & Search ── */}
      {services.length > 0 && (
        <div className="space-y-2">
          {/* Row 1: Search + Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                className="input w-full pl-8 text-sm"
                placeholder={t("provServices_searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input text-sm flex-shrink-0"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="title">{t("provServices_sortAZ")}</option>
              <option value="price">{t("provServices_sortPrice")}</option>
              <option value="category">{t("provServices_sortCategory")}</option>
            </select>
          </div>

          {/* Row 2: Category chips + Clear */}
          {(categories.length > 0 || hasActiveFilters) && (
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${
                    filterCategory === cat
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline whitespace-nowrap ml-auto">
                  {t("provServices_clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Cards ── */}
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 gap-3 text-center">
          <Layers className="h-9 w-9 text-slate-300" />
          <p className="font-semibold text-slate-700">{t("provServices_emptyTitle")}</p>
          <p className="text-sm text-slate-400 max-w-xs">
            {t("provServices_emptyDesc")}
          </p>
          <button onClick={openNew} className="btn-primary mt-1 flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> {t("provServices_btnAddService")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 gap-3 text-center">
          <Search className="h-8 w-8 text-slate-300" />
          <p className="text-slate-500 text-sm">{t("provServices_emptyFiltersMsg")}</p>
          <button onClick={clearFilters} className="text-sm text-primary hover:underline">
            {t("provServices_clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((svc) => (
            <div
              key={svc._id}
              className={`bg-white border rounded-2xl p-5 space-y-3 transition-all ${
                svc.isActive ? "border-slate-200" : "border-slate-100 opacity-60"
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 leading-tight truncate">{svc.title}</p>
                    {svc.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5" /> {t("provServices_badgeActive")}
                        </span>
                      ) : (
                        <span className="inline-flex text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {t("provServices_badgeInactive")}
                      </span>
                    )}
                  </div>
                  {svc.category && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      <Tag className="h-2.5 w-2.5" /> {svc.category}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(svc)}
                    title={svc.isActive ? "Deactivate" : "Activate"}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                  >
                    {svc.isActive
                      ? <ToggleRight className="h-4 w-4 text-primary" />
                      : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(svc)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openDuplicate(svc)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {confirmDelete === svc._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(svc._id)}
                        className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                      >
                          {t("provServices_btnDelete")}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(svc._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {svc.description && (
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{svc.description}</p>
              )}

              {/* Card footer */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="h-3 w-3" />
                  {svc.duration || t("provServices_durationNotSet")}
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                  <DollarSign className="h-3 w-3 text-slate-400" />
                  {priceLabel(svc)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
