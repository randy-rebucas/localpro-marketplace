"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Settings, Save, RefreshCw, Building2, Clock, Zap, Users, AlertCircle } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencySettings {
  name: string;
  maxConcurrentJobs: number;
  autoAcceptQuotes: boolean;
  operatingHours: string;
  serviceCategories: string[];
  serviceAreas: string[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsClient() {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [form, setForm]         = useState<AgencySettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchClient<{ settings: AgencySettings }>("/api/provider/agency/settings");
      const normalized: AgencySettings = {
        ...data.settings,
        maxConcurrentJobs: data.settings.maxConcurrentJobs ?? 10,
        autoAcceptQuotes:  data.settings.autoAcceptQuotes  ?? false,
        operatingHours:    data.settings.operatingHours    ?? "",
        serviceCategories: data.settings.serviceCategories ?? [],
        serviceAreas:      data.settings.serviceAreas      ?? [],
      };
      setSettings(normalized);
      setForm(normalized);
      setDirty(false);
    } catch {
      setLoadError(true);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update<K extends keyof AgencySettings>(key: K, value: AgencySettings[K]) {
    setForm((f) => f ? { ...f, [key]: value } : f);
    setDirty(true);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await fetchClient("/api/provider/agency/settings", {
        method: "PATCH",
        body: JSON.stringify({
          maxConcurrentJobs: form.maxConcurrentJobs,
          autoAcceptQuotes:  form.autoAcceptQuotes,
          operatingHours:    form.operatingHours,
        }),
      });
      toast.success("Settings saved.");
      setDirty(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setForm(settings);
    setDirty(false);
  }

  if (loading && !form) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
      </div>
    );
  }

  if (loadError && !form) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600 font-medium">Failed to load settings</p>
        <button onClick={load} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  if (!settings || !form) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Settings className="h-10 w-10 text-slate-300" />
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
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agency Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">{settings.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          {dirty && (
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* ── Unsaved Changes Banner ── */}
      {dirty && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span className="flex-1">You have unsaved changes.</span>
          <button onClick={handleDiscard} className="text-xs underline hover:no-underline">Discard</button>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Building2 className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">Operational</h2>
        </div>
        <div className="px-5 py-5 space-y-5">

          {/* Max Concurrent Jobs */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Users className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Max Concurrent Jobs</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Maximum number of active jobs your agency can handle at the same time.
                New marketplace listings will be hidden when this limit is reached.
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={() => update("maxConcurrentJobs", Math.max(1, form.maxConcurrentJobs - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-lg transition-colors"
              >−</button>
              <span className="w-10 text-center font-bold text-slate-900 text-lg tabular-nums">
                {form.maxConcurrentJobs}
              </span>
              <button
                onClick={() => update("maxConcurrentJobs", Math.min(200, form.maxConcurrentJobs + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-lg transition-colors"
              >+</button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Auto-accept Quotes */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Zap className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Auto-accept Quotes</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically accept job invitations without manual review. Only enable if
                your team has sufficient capacity to handle unexpected requests.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={form.autoAcceptQuotes}
              onClick={() => update("autoAcceptQuotes", !form.autoAcceptQuotes)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none mt-0.5 ${
                form.autoAcceptQuotes ? "bg-primary" : "bg-slate-200"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                form.autoAcceptQuotes ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

        </div>
      </div>

      {/* ── Operating Hours (text) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Clock className="h-4 w-4 text-slate-400" />
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Operating Hours (Display Text)</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Shown on your public profile. For granular day-by-day control, use the <Link href="/provider/business/schedule" className="text-primary hover:underline">Schedule</Link> tab.</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <input
            className="input w-full"
            placeholder="e.g. Mon–Sat 8am–6pm, Sunday by appointment"
            value={form.operatingHours}
            onChange={(e) => update("operatingHours", e.target.value)}
          />
        </div>
      </div>

      {/* ── Read-only info ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Settings className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">Coverage</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Areas</p>
            {settings.serviceAreas.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                None set. <Link href="/provider/business/service-areas" className="text-primary hover:underline">Configure in Territories.</Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {settings.serviceAreas.map((a) => (
                  <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{a}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Categories</p>
            {settings.serviceCategories.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                None set. <Link href="/provider/business/profile" className="text-primary hover:underline">Configure in Profile.</Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {settings.serviceCategories.map((c) => (
                  <span key={c} className="text-xs bg-primary/5 text-primary border border-primary/20 px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Save / Discard ── */}
      {dirty && (
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={handleDiscard} className="btn-secondary">Discard</button>
        </div>
      )}

    </div>
  );
}
