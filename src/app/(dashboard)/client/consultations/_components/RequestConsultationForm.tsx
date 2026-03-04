"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { UserSearch, Camera, FileText, LocateFixed } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardFooter } from "@/components/ui/Card";
import type { ConsultationType } from "@/types";

const LocationAutocomplete = dynamic(
  () => import("@/components/shared/LocationAutocomplete"),
  {
    ssr: false,
    loading: () => (
      <input className="input w-full" placeholder="Loading location search…" disabled />
    ),
  }
);

const GEO_BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

interface Provider {
  userId: {
    _id: string;
    name?: string;
    email?: string;
  };
  bio?: string;
  skills?: string[];
  avgRating?: number;
  completedJobCount?: number;
  isLocalProCertified?: boolean;
}

interface RequestConsultationFormProps {
  userId: string;
}

// ─── Step config ────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Provider & Type", icon: UserSearch },
  { label: "Upload Photos",   icon: Camera },
  { label: "Describe Project", icon: FileText },
];

const STEP_SUBTITLES = [
  "Pick a provider and choose the type of consultation you need.",
  "Upload 1–5 photos to help the provider understand your project.",
  "Give your project a title, description, and location.",
];

// ─── Inline StepIndicator ───────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start gap-1">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
            <div className="flex items-center w-full">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  done   ? "bg-green-500 text-white shadow-sm shadow-green-200"
                         : active
                         ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/10 scale-110"
                         : "bg-slate-100 text-slate-400",
                ].join(" ")}
              >
                {done ? <span className="text-sm">✓</span> : <Icon className="h-3.5 w-3.5" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-1 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-500"
                    style={{ width: done ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
            <span
              className={[
                "text-[10px] font-medium text-center leading-tight",
                active ? "text-primary" : done ? "text-slate-600" : "text-slate-400",
              ].join(" ")}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function RequestConsultationForm({ userId }: RequestConsultationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Provider search
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingProviders, setSearchingProviders] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    targetUserId: "",
    targetUserName: "",
    type: "site_inspection" as ConsultationType,
    title: "",
    description: "",
    location: "",
  });

  // Debounced provider search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) { setProviders([]); return; }
      setSearchingProviders(true);
      try {
        const res = await fetch(`/api/providers?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) { setProviders(await res.json()); setShowSuggestions(true); }
      } catch { /* ignore */ }
      finally { setSearchingProviders(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function update<K extends keyof typeof formData>(field: K, value: typeof formData[K]) {
    setFormData((f) => ({ ...f, [field]: value }));
  }

  const handleSelectProvider = (provider: Provider) => {
    update("targetUserId", provider.userId._id);
    update("targetUserName", provider.userId.name ?? "");
    setSearchQuery(provider.userId.name ?? "");
    setShowSuggestions(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;
    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "misc");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Failed to upload photo");
        const data = await res.json();
        urls.push(data.url);
      }
      setPhotos((prev) => [...prev, ...urls].slice(0, 5));
      e.target.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  // ── Geolocation ───────────────────────────────────────────────────────────

  async function detectLocation() {
    if (!("geolocation" in navigator)) { toast.error("Geolocation not supported by your browser."); return; }
    setIsGeolocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoords({ lat, lng });
      let resolved = "";
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18`,
          { headers: { "Accept-Language": "en", "User-Agent": "LocalPro/1.0" } }
        );
        if (r.ok) resolved = ((await r.json()) as { display_name?: string }).display_name ?? "";
      } catch { /* ignore */ }
      update("location", resolved || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      toast.success("Location detected!");
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 1) toast.error("Location access denied. Enable it in your browser settings.");
      else toast.error("Could not detect your location.");
    } finally { setIsGeolocating(false); }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function validateStep0() {
    if (!formData.targetUserId) { toast.error("Please select a provider"); return false; }
    return true;
  }

  function validateStep1() {
    if (photos.length === 0) { toast.error("Please upload at least one photo"); return false; }
    return true;
  }

  function validateStep2() {
    if (!formData.title || formData.title.length < 5) { toast.error("Title must be at least 5 characters"); return false; }
    if (!formData.description || formData.description.length < 20) { toast.error("Description must be at least 20 characters"); return false; }
    if (!formData.location) { toast.error("Location is required"); return false; }
    return true;
  }

  function nextStep() {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!validateStep2()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          photos,
          ...(coords ? { coordinates: { type: "Point" as const, coordinates: [coords.lng, coords.lat] as [number, number] } } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || data.message || "Failed to create consultation"); return; }
      toast.success("Consultation request sent!");
      router.push(`/client/consultations/${data._id}`);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Request a Consultation</h1>
          <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">{STEP_SUBTITLES[step]}</p>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step card */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{STEPS[step].label}</h2>
          <span className="text-xs text-slate-400 font-medium">Step {step + 1} of {STEPS.length}</span>
        </div>

        <CardBody className="space-y-5">
          {/* ── Step 0: Provider & Type ── */}
          {step === 0 && (
            <>
              <div ref={suggestionsRef} className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Search &amp; Select Provider <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                  placeholder="Search provider name, skills, or bio…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />

                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {searchingProviders ? (
                      <div className="p-3 text-center text-slate-500 text-sm">Searching…</div>
                    ) : providers.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-sm">No providers found</div>
                    ) : (
                      providers.map((provider) => (
                        <button
                          key={provider.userId._id}
                          type="button"
                          onClick={() => handleSelectProvider(provider)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition"
                        >
                          <div className="font-medium text-slate-900 text-sm">
                            {provider.userId.name || "Unknown"}
                            {provider.isLocalProCertified && (
                              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">✓ Certified</span>
                            )}
                          </div>
                          {provider.bio && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{provider.bio}</p>
                          )}
                          <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                            {!!provider.avgRating && provider.avgRating > 0 && (
                              <span>⭐ {provider.avgRating.toFixed(1)}</span>
                            )}
                            {provider.completedJobCount !== undefined && (
                              <span>✓ {provider.completedJobCount} jobs</span>
                            )}
                          </div>
                          {provider.skills && provider.skills.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {provider.skills.slice(0, 3).map((skill) => (
                                <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))}
                              {provider.skills.length > 3 && (
                                <span className="text-xs text-slate-400">+{provider.skills.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {formData.targetUserId && (
                  <div className="mt-2 flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-green-800">
                      ✓ Selected: <strong>{formData.targetUserName || formData.targetUserId}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => { update("targetUserId", ""); update("targetUserName", ""); setSearchQuery(""); }}
                      className="text-xs text-green-700 hover:text-green-900 underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Consultation Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["site_inspection", "chat"] as ConsultationType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update("type", t)}
                      className={[
                        "flex flex-col items-start gap-1 p-4 border-2 rounded-xl text-left transition-all",
                        formData.type === t
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-200 hover:border-slate-300",
                      ].join(" ")}
                    >
                      <span className="text-xl">{t === "site_inspection" ? "🏢" : "💬"}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {t === "site_inspection" ? "Site Inspection" : "Chat"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {t === "site_inspection" ? "In-person visit to your location" : "Remote chat-based assessment"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 1: Upload Photos ── */}
          {step === 1 && (
            <>
              <label
                htmlFor="photo-upload"
                className={[
                  "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors",
                  uploadingPhotos || photos.length >= 5
                    ? "opacity-50 cursor-not-allowed border-slate-200"
                    : "border-slate-300 hover:border-primary hover:bg-primary/5",
                ].join(" ")}
              >
                <span className="text-4xl">📷</span>
                <div className="text-center">
                  <p className="font-medium text-slate-800">
                    {uploadingPhotos ? "Uploading…" : "Click to upload photos"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{photos.length}/5 photos · JPG, PNG, WebP</p>
                </div>
                <input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhotos || photos.length >= 5}
                />
              </label>

              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span>⚠️</span>
                <span>
                  By requesting a consultation, you agree that any work arranged through this platform must be booked
                  and paid via LocalPro per our{" "}
                  <a href="/terms" className="underline font-medium" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>.
                  Bypassing the platform is a violation and may result in account suspension.
                </span>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Describe Project ── */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Brief Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g., Roof repair needed"
                  maxLength={200}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-slate-400 mt-1">{formData.title.length}/200 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe what needs to be done, any relevant context, access constraints, etc."
                  minLength={20}
                  maxLength={1000}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-slate-400 mt-1">{formData.description.length}/1000 characters</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <button type="button" onClick={detectLocation} disabled={isGeolocating} className={GEO_BTN}>
                    <LocateFixed className={`h-3.5 w-3.5 ${isGeolocating ? "animate-spin" : ""}`} />
                    {isGeolocating ? "Detecting…" : "Use my location"}
                  </button>
                </div>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={(address, c) => {
                    update("location", address);
                    setCoords(c ?? null);
                  }}
                />
              </div>
            </>
          )}
        </CardBody>

        <CardFooter className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            ← Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep} isLoading={uploadingPhotos}>
              {uploadingPhotos ? "Uploading…" : "Continue →"}
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={submitting}>
              🚀 Send Request
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
