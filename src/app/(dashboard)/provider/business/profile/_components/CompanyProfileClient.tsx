"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2, Save, RefreshCw, Plus, X, AlertCircle,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyProfile {
  _id: string;
  name: string;
  type: "agency" | "company" | "other";
  description?: string;
  businessRegistrationNo?: string;
  operatingHours?: string;
  website?: string;
  logo?: string;
  banner?: string;
  serviceCategories?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  "Cleaning", "Repairs", "Security", "Maintenance", "Landscaping",
  "Plumbing", "Electrical", "Pest Control", "Moving", "IT Support",
  "Catering", "Logistics", "Painting", "Air Conditioning",
  "Carpentry", "Welding", "Roofing", "Other",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompanyProfileClient() {
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  const [name, setName]                       = useState("");
  const [type, setType]                       = useState<"agency" | "company" | "other">("agency");
  const [description, setDescription]         = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [operatingHours, setOperatingHours]   = useState("");
  const [website, setWebsite]                 = useState("");
  const [logo, setLogo]                       = useState("");
  const [banner, setBanner]                   = useState("");
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);

  // helpers that also mark dirty
  function field<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchClient<{ agency: AgencyProfile | null }>("/api/provider/agency/profile");
      if (data.agency) {
        setProfile(data.agency);
        setName(data.agency.name ?? "");
        setType(data.agency.type ?? "agency");
        setDescription(data.agency.description ?? "");
        setRegistrationNumber(data.agency.businessRegistrationNo ?? "");
        setOperatingHours(data.agency.operatingHours ?? "");
        setWebsite(data.agency.website ?? "");
        setLogo(data.agency.logo ?? "");
        setBanner(data.agency.banner ?? "");
        setServiceCategories(data.agency.serviceCategories ?? []);
        setDirty(false);
      }
    } catch {
      setLoadError(true);
      toast.error("Failed to load profile.");
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleCategory(cat: string) {
    setServiceCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setDirty(true);
  }

  async function handleSave() {
    if (!name.trim()) return toast.error("Agency name is required.");
    setSaving(true);
    try {
      await fetchClient("/api/provider/agency/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name, type, description, businessRegistrationNo: registrationNumber,
          operatingHours, website, logo, banner, serviceCategories,
        }),
      });
      toast.success("Profile saved successfully.");
      setDirty(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">Failed to load profile</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Building2 className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No agency profile found.{" "}
          <Link href="/provider/business" className="text-primary underline">Create one first.</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Company Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Edit your agency&apos;s public information.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Unsaved Changes Banner ── */}
      {dirty && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span className="flex-1">You have unsaved changes.</span>
          <button onClick={load} className="text-xs underline hover:no-underline">Discard</button>
        </div>
      )}

      {/* ── Section 1: Basic Info ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Basic Info</h2>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Agency / Company Name *</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cebu Pro Services Agency" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
          <select className="input w-full" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="agency">Agency</option>
            <option value="company">Company</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description / About</label>
          <textarea
            className="input w-full min-h-[80px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your agency's services, experience, and values…"
          />
        </div>
      </div>

      {/* ── Section 2: Business Details ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Business Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Business Registration Number</label>
            <input className="input w-full" value={registrationNumber} onChange={(e) => field(setRegistrationNumber)(e.target.value)} placeholder="e.g. DTI-2024-12345" />
            <p className="text-[11px] text-slate-400 mt-1">DTI, SEC, or local business permit number.</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Operating Hours</label>
            <input className="input w-full" value={operatingHours} onChange={(e) => field(setOperatingHours)(e.target.value)} placeholder="e.g. Mon–Fri 8am–6pm" />
            <p className="text-[11px] text-slate-400 mt-1">Shown on your public profile.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Website URL</label>
            <input className="input w-full" type="url" value={website} onChange={(e) => field(setWebsite)(e.target.value)} placeholder="https://yourwebsite.com" />
          </div>
        </div>
      </div>

      {/* ── Section 3: Branding ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Branding</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Logo URL</label>
            <input className="input w-full" value={logo} onChange={(e) => field(setLogo)(e.target.value)} placeholder="https://cdn.example.com/logo.png" />
            {logo && (
              <div className="mt-2 flex items-center gap-2">
                <Image src={logo} alt="logo preview" width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-slate-200" onError={() => { setLogo(""); setDirty(true); }} />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Logo preview</p>
                  <button type="button" onClick={() => { setLogo(""); setDirty(true); }} className="text-[11px] text-red-400 hover:underline">Remove</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Banner URL</label>
            <input className="input w-full" value={banner} onChange={(e) => field(setBanner)(e.target.value)} placeholder="https://cdn.example.com/banner.jpg" />
            {banner && (
              <div className="mt-2 space-y-1">
                <Image src={banner} alt="banner preview" width={400} height={80} className="w-full h-14 object-cover rounded-lg border border-slate-200" onError={() => { setBanner(""); setDirty(true); }} />
                <button type="button" onClick={() => { setBanner(""); setDirty(true); }} className="text-[11px] text-red-400 hover:underline">Remove</button>
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-slate-400">Paste a direct image URL. Use Cloudinary, Imgur, or any CDN.</p>
      </div>

      {/* ── Section 4: Service Categories ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-semibold text-slate-800">Service Categories</h2>
          {serviceCategories.length > 0 && (
            <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {serviceCategories.length} selected
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">Select all categories your agency provides services in.</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.map((cat) => {
            const active = serviceCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Save ── */}
      <div className="flex gap-3 pb-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Profile"}
        </button>
        <button onClick={load} className="btn-secondary">Discard Changes</button>
      </div>

    </div>
  );
}
