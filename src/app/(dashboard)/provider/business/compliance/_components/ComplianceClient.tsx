"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck, FileText, Award, ReceiptText, FileCheck2,
  CheckCircle, Clock, AlertTriangle, Plus, Trash2, Save,
  X, RefreshCw, ExternalLink, AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type PermitStatus    = "pending" | "verified" | "expired";
type InsuranceStatus = "pending" | "verified" | "expired" | "none";
type TaxStatus       = "compliant" | "pending" | "not_provided";

interface Permit {
  title:  string;
  url:    string;
  status: PermitStatus;
}

interface Compliance {
  permits:         Permit[];
  insuranceUrl:    string | null;
  insuranceStatus: InsuranceStatus;
  tin:             string;
  vat:             string;
  taxStatus:       TaxStatus;
}

interface ComplianceResponse {
  name:       string;
  compliance: Compliance;
}

const EMPTY_PERMIT: Omit<Permit, never> = { title: "", url: "", status: "pending" };

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<PermitStatus | "none", string> = {
  verified: "bg-emerald-100 text-emerald-700",
  pending:  "bg-amber-100 text-amber-700",
  expired:  "bg-red-100 text-red-600",
  none:     "bg-slate-100 text-slate-500",
};

const STATUS_ICON: Record<PermitStatus | "none", typeof CheckCircle> = {
  verified: CheckCircle,
  pending:  Clock,
  expired:  AlertTriangle,
  none:     AlertTriangle,
};

const TAX_STATUS_BADGE: Record<TaxStatus, string> = {
  compliant:    "bg-emerald-100 text-emerald-700",
  pending:      "bg-amber-100 text-amber-700",
  not_provided: "bg-slate-100 text-slate-500",
};

// Labels built inside component via t()

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ComplianceClient() {
  const t = useTranslations("providerPages");

  const TAX_STATUS_LABEL: Record<TaxStatus, string> = {
    compliant:    t("provCompliance_taxOptCompliant"),
    pending:      t("provCompliance_taxStatusPending"),
    not_provided: t("provCompliance_taxStatusNotProvided"),
  };

  const INS_STATUS_LABEL: Record<InsuranceStatus, string> = {
    verified: t("provCompliance_insStatusVerified"),
    pending:  t("provCompliance_taxStatusPending"),
    expired:  t("provCompliance_insStatusExpired"),
    none:     t("provCompliance_insStatusNone"),
  };

  const PERMIT_STATUS_LABEL: Record<PermitStatus, string> = {
    verified: t("provCompliance_permitStatusVerified"),
    pending:  t("provCompliance_permitStatusPending"),
    expired:  t("provCompliance_permitStatusExpired"),
  };

  const [name, setName]           = useState("");
  const [data, setData]           = useState<Compliance | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Tax / Insurance form state
  const [taxForm, setTaxForm]     = useState({ tin: "", vat: "", taxStatus: "not_provided" as TaxStatus });
  const [insForm, setInsForm]     = useState({ insuranceUrl: "", insuranceStatus: "none" as InsuranceStatus });
  const [savingTax, setSavingTax] = useState(false);
  const [savingIns, setSavingIns] = useState(false);

  // Permit form state
  const [showPermitForm, setShowPermitForm]   = useState(false);
  const [permitForm, setPermitForm]           = useState<Permit>({ ...EMPTY_PERMIT });
  const [savingPermit, setSavingPermit]       = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetchClient<ComplianceResponse>("/api/provider/agency/compliance");
      setName(res.name);
      setData(res.compliance);
      setTaxForm({
        tin:       res.compliance.tin       ?? "",
        vat:       res.compliance.vat       ?? "",
        taxStatus: res.compliance.taxStatus ?? "not_provided",
      });
      setInsForm({
        insuranceUrl:    res.compliance.insuranceUrl    ?? "",
        insuranceStatus: res.compliance.insuranceStatus ?? "none",
      });
    } catch {
      setLoadError(true);
      toast.error(t("provCompliance_errLoad"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Score computation ──────────────────────────────────────────────────────

  function computeScore(c: Compliance) {
    let met = 0;
    if (c.permits.length > 0)                    met++;
    if (c.insuranceStatus === "verified")         met++;
    if (c.tin.trim())                             met++;
    if (c.taxStatus === "compliant")              met++;
    if (c.permits.some((p) => p.status === "verified")) met++;
    return { met, total: 5 };
  }

  // ── Save tax info ──────────────────────────────────────────────────────────

  async function handleSaveTax() {
    setSavingTax(true);
    try {
      await fetchClient("/api/provider/agency/compliance", {
        method: "PATCH",
        body: JSON.stringify(taxForm),
      });
      toast.success(t("provCompliance_toastTaxSaved"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provCompliance_errSave"));
    } finally {
      setSavingTax(false);
    }
  }

  // ── Save insurance info ────────────────────────────────────────────────────

  async function handleSaveInsurance() {
    setSavingIns(true);
    try {
      await fetchClient("/api/provider/agency/compliance", {
        method: "PATCH",
        body: JSON.stringify({
          insuranceUrl:    insForm.insuranceUrl || null,
          insuranceStatus: insForm.insuranceStatus,
        }),
      });
      toast.success(t("provCompliance_toastInsSaved"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provCompliance_errSave"));
    } finally {
      setSavingIns(false);
    }
  }

  // ── Add permit ─────────────────────────────────────────────────────────────

  async function handleAddPermit() {
    if (!permitForm.title.trim()) { toast.error(t("provCompliance_errPermitTitle")); return; }
    setSavingPermit(true);
    try {
      await fetchClient("/api/provider/agency/compliance", {
        method: "POST",
        body: JSON.stringify(permitForm),
      });
      toast.success(t("provCompliance_toastPermitAdded"));
      setShowPermitForm(false);
      setPermitForm({ ...EMPTY_PERMIT });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provCompliance_errAddPermit"));
    } finally {
      setSavingPermit(false);
    }
  }

  // ── Delete permit ──────────────────────────────────────────────────────────

  async function handleDeletePermit(idx: number) {
    setConfirmDelete(null);
    try {
      await fetchClient(`/api/provider/agency/compliance?permitIndex=${idx}`, { method: "DELETE" });
      toast.success(t("provCompliance_toastPermitRemoved"));
      await load();
    } catch {
      toast.error(t("provCompliance_errRemovePermit"));
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-24 bg-slate-200 rounded-2xl" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">{t("provCompliance_errLoadHeading")}</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">{t("provCompliance_btnRetry")}</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldCheck className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          {t("provCompliance_noAgency")}{" "}
          <Link href="/provider/business" className="text-primary underline">{t("provCompliance_noAgencyLink")}</Link>
        </p>
      </div>
    );
  }

  const { met, total } = computeScore(data);
  const score = Math.round((met / total) * 100);
  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
  const barColor   = score >= 80 ? "bg-emerald-500"   : score >= 40 ? "bg-amber-400"   : "bg-red-500";

  // What's missing
  const tips: string[] = [];
  if (data.permits.length === 0)                          tips.push(t("provCompliance_tipNoPermits"));
  if (!data.permits.some((p) => p.status === "verified")) tips.push(t("provCompliance_tipVerifyPermit"));
  if (data.insuranceStatus !== "verified")                tips.push(t("provCompliance_tipInsurance"));
  if (!data.tin.trim())                                   tips.push(t("provCompliance_tipTin"));
  if (data.taxStatus !== "compliant")                     tips.push(t("provCompliance_tipTaxStatus"));

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/30">
            <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("provCompliance_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{name}</p>
          </div>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Compliance Score ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 ring-4 ring-primary/10 p-3 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">{t("provCompliance_scoreTitle")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t("provCompliance_scoreMet", { met, total })}</p>
            </div>
          </div>
          <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{score}%</p>
        </div>
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {t("provCompliance_scoreNote")}
          </p>
        </div>
        {tips.length > 0 && score < 100 && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">{t("provCompliance_tipsLabel")}</p>
            <ul className="space-y-1">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-1.5 text-xs text-amber-800">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Business Permits ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="bg-blue-50 ring-4 ring-blue-100 p-2 rounded-xl">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
              <h3 className="font-semibold text-slate-800">{t("provCompliance_permitsTitle")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t("provCompliance_permitsDesc")}</p>
          </div>
          {data.permits.length > 0 && (
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {data.permits.length}
            </span>
          )}
          <button
            onClick={() => { setShowPermitForm((v) => !v); setPermitForm({ ...EMPTY_PERMIT }); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary border border-slate-200 hover:border-primary/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> {t("provCompliance_btnAddPermit")}
          </button>
        </div>

        {/* Add permit form */}
        {showPermitForm && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("provCompliance_permitFormTitle")}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_permitFieldTitle")}</label>
                <input
                  className="input w-full"
                  placeholder={t("provCompliance_permitPlaceholderTitle")}
                  value={permitForm.title}
                  onChange={(e) => setPermitForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_permitFieldUrl")}</label>
                <input
                  className="input w-full"
                  placeholder={t("provCompliance_permitPlaceholderUrl")}
                  value={permitForm.url}
                  onChange={(e) => setPermitForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_permitFieldStatus")}</label>
                <select
                  className="input w-full"
                  value={permitForm.status}
                  onChange={(e) => setPermitForm((f) => ({ ...f, status: e.target.value as PermitStatus }))}
                >
                  <option value="pending">{t("provCompliance_permitStatusPending")}</option>
                  <option value="verified">{t("provCompliance_permitStatusVerified")}</option>
                  <option value="expired">{t("provCompliance_permitStatusExpired")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddPermit} disabled={savingPermit} className="btn-primary flex items-center gap-2 text-sm">
                <Save className="h-3.5 w-3.5" /> {savingPermit ? t("provCompliance_btnSaving") : t("provCompliance_btnAddPermit")}
              </button>
              <button onClick={() => setShowPermitForm(false)} className="btn-secondary text-sm">{t("provCompliance_btnCancel")}</button>
            </div>
          </div>
        )}

        {/* Permit list */}
        {data.permits.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400 italic">{t("provCompliance_permitEmpty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.permits.map((permit, idx) => {
              const Icon = STATUS_ICON[permit.status] ?? AlertTriangle;
              return (
                <div key={idx} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${
                    permit.status === "verified" ? "text-emerald-500" :
                    permit.status === "pending"  ? "text-amber-500"   : "text-red-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{permit.title}</p>
                    {permit.url && (
                      <a
                        href={permit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> {t("provCompliance_viewDocument")}
                      </a>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${STATUS_BADGE[permit.status]}`}>
                    {PERMIT_STATUS_LABEL[permit.status]}
                  </span>
                  {confirmDelete === idx ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeletePermit(idx)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                        {t("provCompliance_btnRemove")}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Insurance ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="bg-violet-50 ring-4 ring-violet-100 p-2 rounded-xl">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
          </div>
          <div>
              <h3 className="font-semibold text-slate-800">{t("provCompliance_insTitle")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t("provCompliance_insDesc")}</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_insFieldUrl")}</label>
            <input
              className="input w-full"
              placeholder={t("provCompliance_insPlaceholderUrl")}
              value={insForm.insuranceUrl}
              onChange={(e) => setInsForm((f) => ({ ...f, insuranceUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_insFieldStatus")}</label>
            <select
              className="input w-full"
              value={insForm.insuranceStatus}
              onChange={(e) => setInsForm((f) => ({ ...f, insuranceStatus: e.target.value as InsuranceStatus }))}
            >
              <option value="none">{t("provCompliance_insStatusNone")}</option>
              <option value="pending">{t("provCompliance_insStatusPending")}</option>
              <option value="verified">{t("provCompliance_insStatusVerified")}</option>
              <option value="expired">{t("provCompliance_insStatusExpired")}</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = STATUS_ICON[insForm.insuranceStatus === "none" ? "none" : insForm.insuranceStatus];
                return (
                  <>
                    <Icon className={`h-4 w-4 ${
                      insForm.insuranceStatus === "verified" ? "text-emerald-500" :
                      insForm.insuranceStatus === "pending"  ? "text-amber-500"   :
                      insForm.insuranceStatus === "expired"  ? "text-red-500"     : "text-slate-300"
                    }`} />
                    <span className="text-sm text-slate-600">{INS_STATUS_LABEL[insForm.insuranceStatus]}</span>
                  </>
                );
              })()}
            </div>
            <button onClick={handleSaveInsurance} disabled={savingIns} className="btn-primary flex items-center gap-2 text-sm">
              <Save className="h-3.5 w-3.5" /> {savingIns ? t("provCompliance_btnSaving") : t("provCompliance_btnSave")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Certifications info ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="bg-amber-50 ring-4 ring-amber-100 p-2 rounded-xl">
            <Award className="h-5 w-5 text-amber-600" />
          </div>
          <div>
              <h3 className="font-semibold text-slate-800">{t("provCompliance_certTitle")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t("provCompliance_certDesc")}</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-slate-500">
            {t("provCompliance_certTextPre")}{" "}
            <Link href="/provider/business/profile" className="text-primary hover:underline font-medium">
              {t("provCompliance_certProfileLink")}
            </Link>
            {t("provCompliance_certTextPost")}
          </p>
        </div>
      </div>

      {/* ── Tax Information ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="bg-emerald-50 ring-4 ring-emerald-100 p-2 rounded-xl">
            <ReceiptText className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
              <h3 className="font-semibold text-slate-800">{t("provCompliance_taxTitle")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t("provCompliance_taxDesc")}</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_taxFieldTin")}</label>
              <input
                className="input w-full font-mono"
                placeholder="000-000-000-000"
                value={taxForm.tin}
                onChange={(e) => setTaxForm((f) => ({ ...f, tin: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_taxFieldVat")}</label>
              <input
                className="input w-full font-mono"
                placeholder={t("provCompliance_taxPlaceholderVat")}
                value={taxForm.vat}
                onChange={(e) => setTaxForm((f) => ({ ...f, vat: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("provCompliance_taxFieldStatus")}</label>
            <select
              className="input w-full"
              value={taxForm.taxStatus}
              onChange={(e) => setTaxForm((f) => ({ ...f, taxStatus: e.target.value as TaxStatus }))}
            >
              <option value="not_provided">{t("provCompliance_taxOptNotProvided")}</option>
              <option value="pending">{t("provCompliance_taxOptPending")}</option>
              <option value="compliant">{t("provCompliance_taxOptCompliant")}</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TAX_STATUS_BADGE[taxForm.taxStatus]}`}>
              {TAX_STATUS_LABEL[taxForm.taxStatus]}
            </span>
            <button onClick={handleSaveTax} disabled={savingTax} className="btn-primary flex items-center gap-2 text-sm">
              <Save className="h-3.5 w-3.5" /> {savingTax ? t("provCompliance_btnSaving") : t("provCompliance_btnSave")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Contracts & Templates ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="bg-teal-50 ring-4 ring-teal-100 p-2 rounded-xl">
            <FileCheck2 className="h-5 w-5 text-teal-600" />
          </div>
          <div>
              <h3 className="font-semibold text-slate-800">{t("provCompliance_contractsTitle")}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t("provCompliance_contractsDesc")}</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-3">
          {[
            { label: t("provCompliance_ctSvcAgreement"),  detail: t("provCompliance_ctSvcAgreementDetail") },
            { label: t("provCompliance_ctStaffNda"),      detail: t("provCompliance_ctStaffNdaDetail") },
            { label: t("provCompliance_ctWorkOrder"),     detail: t("provCompliance_ctWorkOrderDetail") },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-[11px] text-slate-400">{item.detail}</p>
              </div>
              <span className="text-[11px] text-slate-400 italic">{t("provCompliance_comingSoon")}</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 pt-1">
            {t("provCompliance_emailNote")}{" "}
            <span className="text-primary">support@localpro.ph</span>.
          </p>
        </div>
      </div>

    </div>
  );
}
