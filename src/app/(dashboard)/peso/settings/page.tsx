"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Settings, Building2, Save, Loader2, LockKeyhole,
  MailIcon, MapPin, Camera, ImageIcon, Phone, Smartphone,
  Globe, Home, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { apiFetch } from "@/lib/fetchClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfficeSettings {
  _id: string;
  officeName: string;
  officeType?: string | null;
  municipality: string;
  province?: string | null;
  region: string;
  zipCode?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  contactMobile?: string | null;
  address?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
}

type FormState = {
  officeName:    string;
  officeType:    string;
  municipality:  string;
  province:      string;
  region:        string;
  zipCode:       string;
  contactEmail:  string;
  contactPhone:  string;
  contactMobile: string;
  address:       string;
  website:       string;
  isActive:      boolean;
};

const EMPTY_FORM: FormState = {
  officeName: "", officeType: "", municipality: "", province: "",
  region: "", zipCode: "", contactEmail: "", contactPhone: "",
  contactMobile: "", address: "", website: "", isActive: true,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFICE_TYPES = [
  { value: "city",       label: "City PESO" },
  { value: "municipal",  label: "Municipal PESO" },
  { value: "provincial", label: "Provincial PESO" },
];

const PH_REGIONS = [
  "NCR — National Capital Region",
  "CAR — Cordillera Administrative Region",
  "Region I — Ilocos Region",
  "Region II — Cagayan Valley",
  "Region III — Central Luzon",
  "Region IV-A — CALABARZON",
  "Region IV-B — MIMAROPA",
  "Region V — Bicol Region",
  "Region VI — Western Visayas",
  "Region VII — Central Visayas",
  "Region VIII — Eastern Visayas",
  "Region IX — Zamboanga Peninsula",
  "Region X — Northern Mindanao",
  "Region XI — Davao Region",
  "Region XII — SOCCSKSARGEN",
  "Region XIII — Caraga",
  "BARMM — Bangsamoro",
];

const INPUT_CLS =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none " +
  "focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400 " +
  "transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

const SELECT_CLS =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white " +
  "focus:ring-1 focus:ring-blue-400 focus:border-blue-400 " +
  "transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

const LABEL_CLS  = "text-xs font-medium text-slate-600";
const SECTION_CLS = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Req() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PesoSettingsPage() {
  const { user } = useAuthStore();
  const [office, setOffice]               = useState<OfficeSettings | null>(null);
  const [loading, setLoading]             = useState(true);
  const [form, setForm]                   = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved]                 = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [isHead, setIsHead]               = useState(false);
  const [logoPreview, setLogoPreview]     = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving]   = useState(false);
  const [isDragging, setIsDragging]       = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Generic text-input handler
  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const isDirty = (Object.keys(EMPTY_FORM) as (keyof FormState)[]).some(
    (k) => form[k] !== saved[k]
  );

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch("/api/peso/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load office settings");
        return r.json();
      })
      .then((data: OfficeSettings) => {
        setOffice(data);
        const snap: FormState = {
          officeName:    data.officeName    ?? "",
          officeType:    data.officeType    ?? "",
          municipality:  data.municipality  ?? "",
          province:      data.province      ?? "",
          region:        data.region        ?? "",
          zipCode:       data.zipCode       ?? "",
          contactEmail:  data.contactEmail  ?? "",
          contactPhone:  data.contactPhone  ?? "",
          contactMobile: data.contactMobile ?? "",
          address:       data.address       ?? "",
          website:       data.website       ?? "",
          isActive:      data.isActive      ?? true,
        };
        setForm(snap);
        setSaved(snap);
        setLogoPreview(data.logoUrl ?? null);
        const headId = (data as unknown as Record<string, unknown>).headOfficerId;
        const headStr = typeof headId === "object" && headId !== null
          ? String((headId as Record<string, unknown>)._id ?? headId)
          : String(headId ?? "");
        setIsHead(user ? headStr === String(user._id) : false);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  function handleReset() { setForm(saved); }

  // ── Logo handlers ────────────────────────────────────────────────────────────
  async function uploadLogoFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be 2 MB or smaller"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res  = await apiFetch("/api/peso/settings/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setOffice(data);
      setLogoPreview(data.logoUrl ?? null);
      toast.success("Office logo updated");
    } catch (err: unknown) {
      setLogoPreview(office?.logoUrl ?? null);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      URL.revokeObjectURL(objectUrl);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadLogoFile(file);
  }

  function handleLogoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogoFile(file);
  }

  async function handleLogoRemove() {
    if (logoRemoving) return;
    setLogoRemoving(true);
    try {
      const res  = await apiFetch("/api/peso/settings/logo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Remove failed");
      setOffice(data);
      setLogoPreview(null);
      toast.success("Logo removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setLogoRemoving(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      // Normalize empty optional strings → null so Mongoose stores null
      const payload = {
        ...form,
        officeType:    form.officeType    || null,
        province:      form.province      || null,
        zipCode:       form.zipCode       || null,
        contactPhone:  form.contactPhone  || null,
        contactMobile: form.contactMobile || null,
        address:       form.address       || null,
        website:       form.website       || null,
      };
      const res  = await apiFetch("/api/peso/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setOffice(data);
      setSaved(form);
      toast.success("Office settings updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
        <div className="space-y-1.5">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-3.5 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-28 bg-blue-100 rounded-xl" />
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-7 w-28 bg-slate-100 rounded-lg" />
          </div>
          <div className="flex gap-4">
            <div className="h-24 w-24 bg-slate-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-48 bg-slate-100 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
        {[1, 2].map((s) => (
          <div key={s} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="h-3 w-32 bg-slate-100 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-100 rounded" />
                <div className="h-9 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!office) return null;

  const officeTypeLbl = OFFICE_TYPES.find((t) => t.value === form.officeType)?.label ?? "";
  const locationLine  = [form.municipality, form.province, form.region].filter(Boolean).join(", ");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            PESO Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isHead
              ? "Manage your office details and configuration."
              : "View your office settings. Only the head officer can make changes."}
          </p>
        </div>
        {!isHead && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 border border-slate-200 rounded-lg px-3 py-1.5">
            <LockKeyhole className="h-3.5 w-3.5" />
            Read-only view
          </span>
        )}
      </div>

      {/* ── Office banner (live preview) ────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-xl px-5 py-4 text-white flex items-start gap-4 shadow-sm">
        {logoPreview ? (
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-white/20 shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="logo" className="h-full w-full object-contain p-0.5" />
          </div>
        ) : (
          <Building2 className="h-6 w-6 opacity-70 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50 mb-0.5">
            {officeTypeLbl || "PESO Office"}
          </p>
          <p className="font-bold text-base leading-snug truncate">
            {form.officeName || office.officeName}
          </p>
          {locationLine && (
            <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {locationLine}
              {form.zipCode && <span className="opacity-70 ml-1">{form.zipCode}</span>}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {form.contactEmail && (
              <span className="text-xs opacity-60 flex items-center gap-1">
                <MailIcon className="h-3 w-3" />{form.contactEmail}
              </span>
            )}
            {form.contactPhone && (
              <span className="text-xs opacity-60 flex items-center gap-1">
                <Phone className="h-3 w-3" />{form.contactPhone}
              </span>
            )}
          </div>
        </div>
        <span className={`shrink-0 self-start text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
          form.isActive ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/40"
        }`}>
          {form.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* ── Logo ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={SECTION_CLS}>Office Logo</p>
            <p className="text-xs text-slate-400">PNG, JPG or SVG — max 2 MB, square preferred</p>
          </div>
          {isHead && (
            <div className="flex items-center gap-2">
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  disabled={logoRemoving || logoUploading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {logoRemoving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {logoRemoving ? "Removing…" : "Remove"}
                </button>
              )}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading || logoRemoving}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {logoUploading ? "Uploading…" : logoPreview ? "Change" : "Upload"}
              </button>
            </div>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
        <div className="flex items-center gap-4">
          <div
            role={isHead ? "button" : undefined}
            tabIndex={isHead ? 0 : undefined}
            aria-label="Upload logo"
            onClick={() => isHead && logoInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && isHead && logoInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (isHead) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={isHead ? handleLogoDrop : undefined}
            className={`relative h-24 w-24 rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center shrink-0 transition-colors ${
              isDragging ? "border-blue-400 bg-blue-50"
              : isHead   ? "border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50"
              :             "border-slate-200 bg-slate-50"
            }`}
          >
            {(logoUploading || logoRemoving) && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            )}
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Office logo" className="absolute inset-0 h-full w-full object-contain p-1.5" />
            ) : (
              <>
                <ImageIcon className="h-7 w-7 text-slate-300 mb-1" />
                {isHead && (
                  <span className="text-[10px] text-slate-400 text-center px-1 leading-tight">
                    {isDragging ? "Drop here" : "Click or drag"}
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Shown on your office profile and printed referral documents.<br />
            Recommended minimum size: 200 × 200 px.{" "}
            {!isHead && <span className="text-amber-500">Only the head officer can update the logo.</span>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* ── Section 1: Office Identity ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className={SECTION_CLS}>Office Identity</p>

          <div>
            <label className={LABEL_CLS}>Office Name {isHead && <Req />}</label>
            <input
              required disabled={!isHead}
              autoComplete="organization"
              placeholder="e.g. Caloocan City PESO"
              value={form.officeName}
              onChange={set("officeName")}
              className={INPUT_CLS}
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Office Type</label>
            <select disabled={!isHead} value={form.officeType} onChange={set("officeType")} className={SELECT_CLS}>
              <option value="">— Select type —</option>
              {OFFICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <FieldRow>
            <div>
              <label className={LABEL_CLS}>Municipality / City {isHead && <Req />}</label>
              <input
                required disabled={!isHead}
                autoComplete="address-level2"
                placeholder="e.g. Caloocan City"
                value={form.municipality}
                onChange={set("municipality")}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Province</label>
              <input
                disabled={!isHead}
                placeholder="e.g. Metro Manila"
                value={form.province}
                onChange={set("province")}
                className={INPUT_CLS}
              />
            </div>
          </FieldRow>

          <FieldRow>
            <div>
              <label className={LABEL_CLS}>Region {isHead && <Req />}</label>
              <select required disabled={!isHead} value={form.region} onChange={set("region")} className={SELECT_CLS}>
                <option value="">— Select region —</option>
                {PH_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>ZIP Code</label>
              <input
                disabled={!isHead}
                placeholder="e.g. 1400"
                value={form.zipCode}
                onChange={set("zipCode")}
                maxLength={10}
                className={INPUT_CLS}
              />
            </div>
          </FieldRow>
        </div>

        {/* ── Section 2: Contact Information ───────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className={SECTION_CLS}>Contact Information</p>

          <div>
            <label className={LABEL_CLS}>
              <span className="flex items-center gap-1"><MailIcon className="h-3 w-3" /> Official Email {isHead && <Req />}</span>
            </label>
            <input
              required type="email" disabled={!isHead}
              autoComplete="email"
              placeholder="peso@caloocan.gov.ph"
              value={form.contactEmail}
              onChange={set("contactEmail")}
              className={INPUT_CLS}
            />
          </div>

          <FieldRow>
            <div>
              <label className={LABEL_CLS}>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telephone / Landline</span>
              </label>
              <input
                disabled={!isHead} type="tel"
                autoComplete="tel"
                placeholder="(02) 8XXX-XXXX"
                value={form.contactPhone}
                onChange={set("contactPhone")}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mobile Number</span>
              </label>
              <input
                disabled={!isHead} type="tel"
                autoComplete="tel"
                placeholder="09XX XXX XXXX"
                value={form.contactMobile}
                onChange={set("contactMobile")}
                className={INPUT_CLS}
              />
            </div>
          </FieldRow>

          <div>
            <label className={LABEL_CLS}>
              <span className="flex items-center gap-1"><Home className="h-3 w-3" /> Office Address</span>
            </label>
            <textarea
              disabled={!isHead}
              rows={2}
              placeholder="Unit / Floor, Building, Street, Barangay, City"
              value={form.address}
              onChange={set("address")}
              className={INPUT_CLS + " resize-y"}
            />
          </div>

          <div>
            <label className={LABEL_CLS}>
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website <span className="font-normal text-slate-400">(optional)</span></span>
            </label>
            <input
              disabled={!isHead} type="url"
              placeholder="https://peso.caloocan.gov.ph"
              value={form.website}
              onChange={set("website")}
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* ── Section 3: Office Status ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <p className={SECTION_CLS}>Office Status</p>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {form.isActive ? "Office is Active" : "Office is Inactive"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {form.isActive
                  ? "Visible and accepting job postings and provider registrations."
                  : "Hidden from public listings. No new jobs or registrations."}
              </p>
            </div>
            <button
              type="button"
              disabled={!isHead}
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              role="switch"
              aria-checked={form.isActive}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                form.isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                form.isActive ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {!form.isActive && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Deactivating the office will hide it from all provider and client searches. Existing jobs will remain but will not accept new applications.</span>
            </div>
          )}
        </div>

        {/* ── Save bar ───────────────────────────────────────────────────────── */}
        {isHead && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {isDirty && !saving && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Discard
              </button>
            )}
          </div>
        )}
      </form>

      {/* ── Platform configuration (read-only) ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className={SECTION_CLS + " mb-0"}>Platform Configuration</p>
        </div>
        <div className="divide-y divide-slate-100">
          {([
            ["Verification policy",   "PESO officer can assign tags"],
            ["Job approval",          "Instant — no admin review required"],
            ["Bulk onboarding cap",   "200 rows per upload"],
            ["Officer management",    "Head officer only"],
            ["Referral generation",   "PESO-issued, logged per referral"],
            ["Training records",      "Stored per provider profile"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-xs font-semibold text-slate-700">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

