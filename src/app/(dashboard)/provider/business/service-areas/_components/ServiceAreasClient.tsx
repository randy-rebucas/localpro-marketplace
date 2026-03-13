"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapPin, Plus, X, Save, Search, RefreshCw, AlertCircle } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyProfile {
  _id: string;
  name: string;
  serviceAreas: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_AREAS = [
  "Cebu City", "Mandaue City", "Lapu-Lapu City", "Talisay City",
  "Liloan", "Consolacion", "Danao City", "Naga City", "Toledo City",
  "Carcar City", "Minglanilla", "San Fernando", "Compostela",
  "Cordova", "Mactan Island",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServiceAreasClient() {
  const [agency, setAgency]         = useState<AgencyProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [areas, setAreas]           = useState<string[]>([]);
  const [newArea, setNewArea]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [dirty, setDirty]           = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Wire up Google Places autocomplete — falls back gracefully if no API key
  useGooglePlaces(inputRef, (place) => {
    // Extract city/municipality name from address components, fallback to formatted address
    const locality =
      place.address_components?.find((c) => c.types.includes("locality"))?.long_name ??
      place.address_components?.find((c) => c.types.includes("administrative_area_level_2"))?.long_name ??
      place.name ??
      place.formatted_address ??
      "";
    if (locality) addArea(locality);
  }, { types: ["(cities)"], componentRestrictions: { country: "ph" } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<{ agency: AgencyProfile | null }>("/api/provider/agency/profile");
      if (data.agency) {
        setAgency(data.agency);
        setAreas(data.agency.serviceAreas ?? []);
        setDirty(false);
      }
    } catch { toast.error("Failed to load agency profile."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function addArea(area: string) {
    const trimmed = area.trim();
    if (!trimmed || areas.includes(trimmed)) return;
    setAreas((prev) => [...prev, trimmed]);
    setDirty(true);
    setNewArea("");
  }

  function removeArea(area: string) {
    setAreas((prev) => prev.filter((a) => a !== area));
    setDirty(true);
  }

  function addAllCommon() {
    const toAdd = COMMON_AREAS.filter((a) => !areas.includes(a));
    if (toAdd.length === 0) return;
    setAreas((prev) => [...prev, ...toAdd]);
    setDirty(true);
  }

  async function handleSave() {
    if (!agency) return;
    setSaving(true);
    try {
      await fetchClient("/api/provider/agency/profile", {
        method: "PATCH",
        body: JSON.stringify({ serviceAreas: areas }),
      });
      toast.success("Service areas saved.");
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
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <MapPin className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No agency profile found.{" "}
          <a href="/provider/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  const unusedCommonAreas  = COMMON_AREAS.filter((a) => !areas.includes(a));
  const filteredAreas      = areaSearch
    ? areas.filter((a) => a.toLowerCase().includes(areaSearch.toLowerCase()))
    : areas;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/30">
            <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Service Areas</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {agency.name} · {areas.length} area{areas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {dirty && (
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* ── Unsaved banner ── */}
      {dirty && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          You have unsaved changes.
        </div>
      )}

      {/* ── Current Areas ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Current Service Areas
          </label>
          {areas.length > 0 && (
            <button
              onClick={() => { setAreas([]); setDirty(true); }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove all
            </button>
          )}
        </div>

        {/* Search filter for current areas */}
        {areas.length > 4 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              className="input w-full pl-8 text-sm"
              placeholder="Filter current areas…"
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
            />
          </div>
        )}

        {areas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center bg-slate-50 rounded-xl">
            <MapPin className="h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-400">No service areas added yet.</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No areas match your filter.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredAreas.map((area) => (
              <div
                key={area}
                className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 text-primary rounded-full px-3 py-1.5 text-sm font-medium"
              >
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {area}
                <button
                  onClick={() => removeArea(area)}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Add new area ── */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Add Area
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="input flex-1"
              placeholder="Type a city or barangay… (Enter to add)"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArea(newArea); } }}
            />
            <button
              onClick={() => addArea(newArea)}
              disabled={!newArea.trim()}
              className="btn-secondary flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Start typing to search via Google Places, or add any custom area name.
          </p>
        </div>
      </div>

      {/* ── Quick-add suggestions ── */}
      {unusedCommonAreas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Add — Common Cebu Areas
            </label>
            <button
              onClick={addAllCommon}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              Add all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {unusedCommonAreas.map((area) => (
              <button
                key={area}
                onClick={() => addArea(area)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Plus className="h-3 w-3" />
                {area}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Save / Discard (bottom) ── */}
      {dirty && (
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={() => { setAreas(agency.serviceAreas ?? []); setDirty(false); setAreaSearch(""); }}
            className="btn-secondary"
          >
            Discard
          </button>
        </div>
      )}

    </div>
  );
}
