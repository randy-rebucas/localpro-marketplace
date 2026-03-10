"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CheckCircle2, ChevronRight, ChevronLeft,
  MapPin, Tag, ShieldCheck, Upload, X, ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = "government_id" | "tesda_certificate" | "business_permit" | "selfie_with_id" | "other";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "government_id",     label: "Government-issued ID (UMID, Passport, Driver's License)" },
  { value: "tesda_certificate", label: "TESDA Certificate / NC Certificate" },
  { value: "business_permit",   label: "Business Permit / DTI Registration" },
  { value: "selfie_with_id",    label: "Selfie with ID" },
  { value: "other",             label: "Other Document" },
];

interface UploadedDoc { type: DocType; url: string }

const STEPS = [
  { id: 1, label: "Skills",       icon: Tag },
  { id: 2, label: "Service Area", icon: MapPin },
  { id: 3, label: "Documents",    icon: ShieldCheck },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProviderOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);

  // Step 1 — Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [savingSkills, setSavingSkills] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Service area
  const [areaLabel, setAreaLabel] = useState("");
  const [areaAddress, setAreaAddress] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [areaAdded, setAreaAdded] = useState(false);

  // Step 3 — KYC docs
  const [selectedType, setSelectedType] = useState<DocType>("government_id");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Skip onboarding if both skills and a service area already exist
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/providers/profile");
        if (res.ok) {
          const profile = await res.json();
          if ((profile.skills ?? []).length > 0 && (profile.serviceAreas ?? []).length > 0) {
            router.replace("/provider/dashboard");
            return;
          }
        }
      } catch { /* non-critical */ }
      finally { setChecking(false); }
    })();
  }, [router]);

  // ── Step 1 — suggestions ────────────────────────────────────────────────────

  useEffect(() => {
    const raw = skillInput.split(",").pop()?.trim() ?? "";
    if (!raw) { setSuggestions([]); setSuggestionOpen(false); return; }
    const ctrl = new AbortController();
    apiFetch(`/api/skills?q=${encodeURIComponent(raw)}&limit=8`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const labels: string[] = data.skills ?? [];
        const filtered = labels.filter((l) => !skills.includes(l));
        setSuggestions(filtered);
        setSuggestionOpen(filtered.length > 0);
        setActiveSuggestion(-1);
      })
      .catch(() => {});
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillInput]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node))
        setSuggestionOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function commitTokens(raw: string) {
    const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
    setSkills((prev) => {
      const next = [...prev];
      for (const t of tokens) if (!next.includes(t)) next.push(t);
      return next;
    });
    setSkillInput("");
    setSuggestions([]);
    setSuggestionOpen(false);
    setActiveSuggestion(-1);
  }

  function pickSuggestion(label: string) {
    const parts = skillInput.split(",");
    parts[parts.length - 1] = label;
    commitTokens(parts.join(","));
    inputRef.current?.focus();
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestionOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveSuggestion((i) => Math.max(i - 1, 0)); return; }
      if ((e.key === "Enter" || e.key === "Tab") && activeSuggestion >= 0) {
        e.preventDefault(); pickSuggestion(suggestions[activeSuggestion]); return;
      }
    }
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (skillInput.trim()) commitTokens(skillInput); }
    if (e.key === "Backspace" && skillInput === "" && skills.length > 0)
      setSkills((prev) => prev.slice(0, -1));
  }

  async function saveSkills() {
    if (skills.length === 0) { toast.error("Add at least one skill or service"); return; }
    setSavingSkills(true);
    try {
      const res = await apiFetch("/api/providers/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Failed to save skills"); return; }
      setStep(2);
    } catch { toast.error("Something went wrong"); }
    finally { setSavingSkills(false); }
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  async function addServiceArea() {
    if (!areaLabel.trim() || !areaAddress.trim()) { toast.error("Please fill in both fields"); return; }
    setAddingArea(true);
    try {
      const res = await apiFetch("/api/providers/profile/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: areaLabel.trim(), address: areaAddress.trim() }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Failed to add service area"); return; }
      setAreaAdded(true);
      toast.success("Service area saved!");
    } catch { toast.error("Something went wrong"); }
    finally { setAddingArea(false); }
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "kyc");
      const res = await apiFetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      setDocs((prev) => [...prev, { type: selectedType, url: data.url }]);
      toast.success("Document uploaded");
    } catch { toast.error("Upload error"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function submitKyc() {
    if (docs.length === 0) { toast.error("Upload at least one document"); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: docs }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Failed to submit documents"); return; }
      toast.success("Documents submitted for review!");
      router.push("/provider/dashboard");
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Complete Your Provider Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Just a few steps before your account goes live</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((s, i) => {
          const done   = step > s.id;
          const active = step === s.id;
          const Icon   = s.icon;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  done   ? "bg-primary border-primary text-white" :
                  active ? "border-primary text-primary bg-white shadow-sm" :
                           "border-slate-200 text-slate-400 bg-white"
                }`}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${done || active ? "text-primary" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 mb-5 transition-colors ${done ? "bg-primary" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Skills ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">What services do you offer?</h2>
            <p className="text-sm text-slate-500 mt-1">
              Search and select from the list, or type your own and press{" "}
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">Enter</kbd>
              {" "}or{" "}
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">,</kbd>.
            </p>
          </div>

          {/* Input + dropdown */}
          <div className="relative" ref={suggestRef}>
            <input
              ref={inputRef}
              className="input w-full pr-10"
              placeholder="Search skills — e.g. Plumbing, Electrical…"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              onBlur={() => setTimeout(() => setSuggestionOpen(false), 150)}
              onFocus={() => suggestions.length > 0 && setSuggestionOpen(true)}
              autoComplete="off"
            />
            {suggestionOpen && suggestions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((label, i) => (
                  <li key={`${i}-${label}`} className="border-b border-slate-100 last:border-0">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(label); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        i === activeSuggestion
                          ? "bg-primary text-white"
                          : "text-slate-800 hover:bg-slate-50 hover:text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selected skill tags */}
          {skills.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                Selected ({skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                      className="text-primary/60 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No skills added yet — search above or type your own.</p>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={saveSkills} isLoading={savingSkills} disabled={skills.length === 0 || savingSkills}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Service Area ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Where do you provide services?</h2>
            <p className="text-sm text-slate-500 mt-1">Add the city, district, or address range you cover.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Area label</label>
              <input
                className="input w-full"
                placeholder="e.g. Metro Manila"
                value={areaLabel}
                onChange={(e) => setAreaLabel(e.target.value)}
                disabled={areaAdded}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full address / coverage area
              </label>
              <LocationAutocomplete
                value={areaAddress}
                onChange={(address) => setAreaAddress(address)}
                placeholder="Search address or coverage area…"
              />
            </div>
          </div>

          {!areaAdded ? (
            <Button onClick={addServiceArea} isLoading={addingArea} variant="outline" disabled={addingArea}>
              <MapPin className="h-4 w-4 mr-1.5" /> Save Service Area
            </Button>
          ) : (
            <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Service area saved
            </p>
          )}

          <div className="flex justify-between pt-1">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!areaAdded}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: KYC Documents ───────────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upload Identity Documents</h2>
            <p className="text-sm text-slate-500 mt-1">
              Required for identity verification. Supports government IDs, TESDA certificates, and more.
            </p>
          </div>

          <div className="space-y-3">
            {/* Doc type selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document type</label>
              <select
                className="input w-full"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DocType)}
              >
                {DOC_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* File picker */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-primary hover:text-primary rounded-xl px-4 py-4 text-sm text-slate-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading…</>
                  : <><Upload className="h-4 w-4" /> Click to upload document</>}
              </button>
            </div>
          </div>

          {/* Uploaded docs list */}
          {docs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Uploaded ({docs.length})</p>
              {docs.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium text-slate-700 capitalize">{d.type.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-3">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-1">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => router.push("/provider/dashboard")} className="text-slate-400 text-sm">
                Skip for now
              </Button>
              <Button onClick={submitKyc} isLoading={submitting} disabled={docs.length === 0 || submitting}>
                Submit & Finish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
