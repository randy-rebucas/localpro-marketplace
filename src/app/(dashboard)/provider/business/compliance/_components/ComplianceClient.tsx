"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck, FileText, Award, ReceiptText, FileCheck2,
  CheckCircle, Clock, AlertTriangle, Plus, Trash2, Save,
  X, RefreshCw, ExternalLink, AlertCircle,
} from "lucide-react";
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

const TAX_STATUS_LABEL: Record<TaxStatus, string> = {
  compliant:    "Compliant",
  pending:      "Pending",
  not_provided: "Not Provided",
};

const INS_STATUS_LABEL: Record<InsuranceStatus, string> = {
  verified: "Verified",
  pending:  "Pending",
  expired:  "Expired",
  none:     "Not Provided",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ComplianceClient() {
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
      toast.error("Failed to load compliance data.");
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
      toast.success("Tax information saved.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
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
      toast.success("Insurance information saved.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSavingIns(false);
    }
  }

  // ── Add permit ─────────────────────────────────────────────────────────────

  async function handleAddPermit() {
    if (!permitForm.title.trim()) { toast.error("Permit title is required."); return; }
    setSavingPermit(true);
    try {
      await fetchClient("/api/provider/agency/compliance", {
        method: "POST",
        body: JSON.stringify(permitForm),
      });
      toast.success("Permit added.");
      setShowPermitForm(false);
      setPermitForm({ ...EMPTY_PERMIT });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add permit.");
    } finally {
      setSavingPermit(false);
    }
  }

  // ── Delete permit ──────────────────────────────────────────────────────────

  async function handleDeletePermit(idx: number) {
    setConfirmDelete(null);
    try {
      await fetchClient(`/api/provider/agency/compliance?permitIndex=${idx}`, { method: "DELETE" });
      toast.success("Permit removed.");
      await load();
    } catch {
      toast.error("Failed to remove permit.");
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
        <p className="text-slate-600 font-medium">Failed to load compliance data</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldCheck className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No agency profile found.{" "}
          <Link href="/provider/business" className="text-primary underline">Create one first.</Link>
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
  if (data.permits.length === 0)                         tips.push("Add at least one business permit.");
  if (!data.permits.some((p) => p.status === "verified")) tips.push("Get a permit verified.");
  if (data.insuranceStatus !== "verified")                tips.push("Upload and verify insurance coverage.");
  if (!data.tin.trim())                                   tips.push("Enter your TIN number.");
  if (data.taxStatus !== "compliant")                     tips.push("Set tax status to Compliant.");

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/30">
            <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Compliance &amp; Legal</h1>
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
              <h2 className="font-semibold text-slate-800">Compliance Score</h2>
              <p className="text-xs text-slate-400 mt-0.5">{met} of {total} requirements met</p>
            </div>
          </div>
          <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{score}%</p>
        </div>
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Complete all requirements to unlock full agency features and build client trust.
          </p>
        </div>
        {tips.length > 0 && score < 100 && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">What to improve</p>
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
            <h3 className="font-semibold text-slate-800">Business Permits</h3>
            <p className="text-xs text-slate-400 mt-0.5">Licenses and government permits on file.</p>
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
            <Plus className="h-3.5 w-3.5" /> Add Permit
          </button>
        </div>

        {/* Add permit form */}
        {showPermitForm && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Permit</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Title *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Mayor's Business Permit"
                  value={permitForm.title}
                  onChange={(e) => setPermitForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Document URL</label>
                <input
                  className="input w-full"
                  placeholder="https://... (optional)"
                  value={permitForm.url}
                  onChange={(e) => setPermitForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <select
                  className="input w-full"
                  value={permitForm.status}
                  onChange={(e) => setPermitForm((f) => ({ ...f, status: e.target.value as PermitStatus }))}
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddPermit} disabled={savingPermit} className="btn-primary flex items-center gap-2 text-sm">
                <Save className="h-3.5 w-3.5" /> {savingPermit ? "Saving…" : "Add Permit"}
              </button>
              <button onClick={() => setShowPermitForm(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Permit list */}
        {data.permits.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400 italic">No permits on file. Click "Add Permit" to record one.</p>
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
                        <ExternalLink className="h-2.5 w-2.5" /> View document
                      </a>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${STATUS_BADGE[permit.status]}`}>
                    {permit.status}
                  </span>
                  {confirmDelete === idx ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeletePermit(idx)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                        Remove
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
            <h3 className="font-semibold text-slate-800">Insurance</h3>
            <p className="text-xs text-slate-400 mt-0.5">Liability and workers compensation coverage.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Insurance Document URL</label>
            <input
              className="input w-full"
              placeholder="https://drive.google.com/... or other document link"
              value={insForm.insuranceUrl}
              onChange={(e) => setInsForm((f) => ({ ...f, insuranceUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Insurance Status</label>
            <select
              className="input w-full"
              value={insForm.insuranceStatus}
              onChange={(e) => setInsForm((f) => ({ ...f, insuranceStatus: e.target.value as InsuranceStatus }))}
            >
              <option value="none">Not Provided</option>
              <option value="pending">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="expired">Expired</option>
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
              <Save className="h-3.5 w-3.5" /> {savingIns ? "Saving…" : "Save"}
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
            <h3 className="font-semibold text-slate-800">Certifications</h3>
            <p className="text-xs text-slate-400 mt-0.5">Professional certifications and training records.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-slate-500">
            Certifications are managed in your{" "}
            <Link href="/provider/business/profile" className="text-primary hover:underline font-medium">
              Agency Profile
            </Link>
            . Add TESDA, ISO, and other relevant certifications there to display them on your public profile.
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
            <h3 className="font-semibold text-slate-800">Tax Information</h3>
            <p className="text-xs text-slate-400 mt-0.5">Required for payout processing above threshold.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">TIN</label>
              <input
                className="input w-full font-mono"
                placeholder="000-000-000-000"
                value={taxForm.tin}
                onChange={(e) => setTaxForm((f) => ({ ...f, tin: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">VAT Registration No.</label>
              <input
                className="input w-full font-mono"
                placeholder="Optional"
                value={taxForm.vat}
                onChange={(e) => setTaxForm((f) => ({ ...f, vat: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tax Compliance Status</label>
            <select
              className="input w-full"
              value={taxForm.taxStatus}
              onChange={(e) => setTaxForm((f) => ({ ...f, taxStatus: e.target.value as TaxStatus }))}
            >
              <option value="not_provided">Not Provided</option>
              <option value="pending">Pending Verification</option>
              <option value="compliant">Compliant</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TAX_STATUS_BADGE[taxForm.taxStatus]}`}>
              {TAX_STATUS_LABEL[taxForm.taxStatus]}
            </span>
            <button onClick={handleSaveTax} disabled={savingTax} className="btn-primary flex items-center gap-2 text-sm">
              <Save className="h-3.5 w-3.5" /> {savingTax ? "Saving…" : "Save"}
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
            <h3 className="font-semibold text-slate-800">Contracts &amp; Templates</h3>
            <p className="text-xs text-slate-400 mt-0.5">Standard service agreements and work order templates.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-3">
          {[
            { label: "Service Agreement Template",  detail: "Standard client-provider agreement" },
            { label: "Staff NDA Template",          detail: "Non-disclosure for staff members" },
            { label: "Work Order Template",         detail: "Per-job work authorization form" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-[11px] text-slate-400">{item.detail}</p>
              </div>
              <span className="text-[11px] text-slate-400 italic">Coming soon</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 pt-1">
            Need to submit documents? Email us at{" "}
            <span className="text-primary">support@localpro.ph</span>.
          </p>
        </div>
      </div>

    </div>
  );
}
