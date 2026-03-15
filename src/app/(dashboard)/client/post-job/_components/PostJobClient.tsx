"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardFooter } from "@/components/ui/Card";
import { apiFetch } from "@/lib/fetchClient";
import PageGuide from "@/components/shared/PageGuide";
import { Copy } from "lucide-react";
import type { ICategory } from "@/types";
import { trackJobPost } from "@/lib/analytics";

import type { FormData, BudgetHint } from "./types";
import { StepIndicator }  from "./StepIndicator";
import { JobDetails }     from "./steps/JobDetails";
import { BudgetSchedule } from "./steps/BudgetSchedule";
import { Photos }         from "./steps/Photos";
import { ReviewSubmit }   from "./steps/ReviewSubmit";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_TITLES    = ["Job Details", "Budget & Schedule", "Photos", "Review & Submit"];
const STEP_SUBTITLES = [
  "Describe the work you need — AI can help write a description.",
  "Set your budget and preferred date so providers can send accurate quotes.",
  "Add photos to help providers understand the scope. (optional)",
  "Double-check everything before sending to providers.",
];

function makeInitial(data: Partial<FormData> = {}): FormData {
  return {
    title: "",
    category: "",
    description: "",
    budget: "",
    location: "",
    scheduleDate: "",
    specialInstructions: "",
    urgency: "standard",
    ...data,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  categories: ICategory[];
  initialData?: Partial<FormData>;
}

export default function PostJobClient({ categories, initialData }: Props) {
  const router = useRouter();
  const isPrefilled = !!(initialData && Object.values(initialData).some(Boolean));

  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState<FormData>(() => makeInitial(initialData));
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const [isSubmitting, setIsSubmitting]             = useState(false);
  const [isGenerating, setIsGenerating]             = useState(false);
  const [isEstimatingBudget, setIsEstimatingBudget] = useState(false);
  const [isClassifying, setIsClassifying]           = useState(false);
  const [isGeolocating, setIsGeolocating]           = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos]   = useState(false);

  const [budgetHint, setBudgetHint]               = useState<BudgetHint | null>(null);
  const [coords, setCoords]                       = useState<{ lat: number; lng: number } | null>(null);
  const [photoFiles, setPhotoFiles]               = useState<{ file: File; preview: string }[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  // ── AI actions ───────────────────────────────────────────────────────────────
  async function generateDescription() {
    if (!form.title || form.title.trim().length < 3) { toast.error("Enter a job title first."); return; }
    setIsGenerating(true);
    try {
      const res  = await apiFetch("/api/ai/generate-description", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, category: form.category }),
      });
      const data = await res.json() as { description?: string; error?: string };
      if (!res.ok) { toast.error(data.error ?? "AI generation failed"); return; }
      update("description", data.description ?? "");
    } catch { toast.error("Could not reach AI service."); }
    finally   { setIsGenerating(false); }
  }

  async function estimateBudget() {
    if (!form.title || form.title.trim().length < 3) { toast.error("Enter a job title first."); return; }
    setIsEstimatingBudget(true);
    setBudgetHint(null);
    try {
      const res  = await apiFetch("/api/ai/estimate-budget", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, category: form.category, description: form.description }),
      });
      const data = await res.json() as BudgetHint & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Budget estimation failed"); return; }
      setBudgetHint(data);
    } catch { toast.error("Could not reach AI service."); }
    finally   { setIsEstimatingBudget(false); }
  }

  async function classifyCategory() {
    if (!form.title || form.title.trim().length < 3) { toast.error("Enter a job title first."); return; }
    if (categories.length === 0) return;
    setIsClassifying(true);
    try {
      const res  = await apiFetch("/api/ai/classify-category", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description, availableCategories: categories.map((c) => c.name) }),
      });
      const data = await res.json() as { category?: string; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Could not detect category"); return; }
      update("category", data.category ?? "");
      toast.success(`Category set to "${data.category}"`);
    } catch { toast.error("Could not reach AI service."); }
    finally   { setIsClassifying(false); }
  }

  // ── Geolocation ──────────────────────────────────────────────────────────────
  async function detectLocation() {
    if (!("geolocation" in navigator)) { toast.error("Geolocation not supported by your browser."); return; }
    setIsGeolocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      );
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      setCoords({ lat, lng });
      let resolved = "";
      if (accuracy <= 300) {
        if (typeof window !== "undefined" && window.google?.maps) {
          const { results } = await new window.google.maps.Geocoder().geocode({ location: { lat, lng } });
          if (results?.length) {
            const PREFERRED = ["street_address","premise","subpremise","route","neighborhood","sublocality_level_1","sublocality","locality"];
            let best = results[0];
            for (const t of PREFERRED) { const m = results.find((r) => r.types.includes(t)); if (m) { best = m; break; } }
            resolved = best.formatted_address;
          }
        }
        if (!resolved) {
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18`, { headers: { "Accept-Language": "en", "User-Agent": "LocalPro/1.0" } });
            if (r.ok) resolved = ((await r.json()) as { display_name?: string }).display_name ?? "";
          } catch { /* ignore */ }
        }
        update("location", resolved || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        toast.success("Location detected!");
      } else {
        try {
          const r = await fetch("https://ipapi.co/json/");
          if (r.ok) { const d = await r.json() as { city?: string; region?: string; country_name?: string }; resolved = [d.city, d.region, d.country_name].filter(Boolean).join(", "); }
        } catch { /* ignore */ }
        update("location", resolved || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        toast("Approximate area detected — please refine your exact address.", { icon: "⚠️", duration: 5000 });
      }
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 1) toast.error("Location access denied. Enable it in your browser settings.");
      else toast.error("Could not detect your location.");
    } finally { setIsGeolocating(false); }
  }

  // ── Photo handling ────────────────────────────────────────────────────────────
  function handleAddFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 5 - photoFiles.length);
    setPhotoFiles((prev) => [...prev, ...next.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 5));
  }

  function removePhoto(idx: number) {
    setPhotoFiles((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
    setUploadedPhotoUrls([]);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  function validateStep0() {
    const e: Partial<FormData> = {};
    if (!form.title || form.title.length < 5)              e.title       = "Title must be at least 5 characters";
    if (!form.category)                                    e.category    = "Please select a category";
    if (!form.description || form.description.length < 20) e.description = "Description must be at least 20 characters";
    return e;
  }

  function validateStep1() {
    const e: Partial<FormData> = {};
    if (!form.budget || isNaN(Number(form.budget)) || Number(form.budget) < 1) e.budget       = "Please enter a valid budget";
    if (!form.location)                                                          e.location     = "Location is required";
    if (!form.scheduleDate)                                                      e.scheduleDate = "Schedule date is required";
    return e;
  }

  function nextStep() {
    if (step === 0) {
      const errs = validateStep0();
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    if (step === 2) { void uploadPhotosAndAdvance(); return; }
    setErrors({});
    setStep((s) => s + 1);
  }

  async function uploadPhotosAndAdvance() {
    if (photoFiles.length === 0) { setStep(3); return; }
    setIsUploadingPhotos(true);
    const urls: string[] = [];
    try {
      for (const { file } of photoFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const res  = await apiFetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        urls.push(data.url as string);
      }
      setUploadedPhotoUrls(urls);
      setStep(3);
    } catch { toast.error("Photo upload failed. Remove images or try again."); }
    finally   { setIsUploadingPhotos(false); }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
          scheduleDate: new Date(form.scheduleDate).toISOString(),
          ...(uploadedPhotoUrls.length > 0 ? { beforePhoto: uploadedPhotoUrls } : {}),
          ...(coords ? { coordinates: { type: "Point" as const, coordinates: [coords.lng, coords.lat] as [number, number] } } : {}),
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to post job"); return; }
      toast.success("Job posted! It will be reviewed by our team.");
      trackJobPost({ category: form.category, budget: Number(form.budget) });
      router.push("/client/jobs");
    } catch { toast.error("Something went wrong. Please try again."); }
    finally   { setIsSubmitting(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageGuide
        pageKey="client-post-job"
        title="How to post a job"
        steps={[
          { icon: "🔧", title: "Service details",  description: "Choose a category, describe what you need done, and enter your location." },
          { icon: "💰", title: "Budget & schedule", description: "Set your budget and preferred date. Providers use this to send accurate quotes." },
          { icon: "📸", title: "Upload photos",     description: "Add photos to help providers understand the scope of work (optional but recommended)." },
          { icon: "🚀", title: "Submit & wait",     description: "Eligible providers in your area will be notified and start sending quotes." },
        ]}
      />

      {/* Pre-fill notice */}
      {isPrefilled && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Copy className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <p className="text-blue-800">
            <span className="font-medium">Pre-filled from a similar job.</span>{" "}
            Review and adjust each field before submitting.
          </p>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {isPrefilled ? "Post Similar Job" : "Post a Job"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">{STEP_SUBTITLES[step]}</p>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
          {step + 1} / {STEP_TITLES.length}
        </span>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step card */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{STEP_TITLES[step]}</h2>
          <span className="text-xs text-slate-400 font-medium">Step {step + 1} of {STEP_TITLES.length}</span>
        </div>

        <CardBody>
          {step === 0 && (
            <JobDetails
              form={form} errors={errors} categories={categories}
              isGenerating={isGenerating} isClassifying={isClassifying}
              update={update}
              onGenerateDescription={generateDescription}
              onClassifyCategory={classifyCategory}
            />
          )}
          {step === 1 && (
            <BudgetSchedule
              form={form} errors={errors}
              budgetHint={budgetHint}
              isEstimatingBudget={isEstimatingBudget} isGeolocating={isGeolocating}
              onEstimateBudget={estimateBudget}
              onDetectLocation={detectLocation}
              update={update} setCoords={setCoords} setBudgetHint={setBudgetHint}
            />
          )}
          {step === 2 && (
            <Photos
              photoFiles={photoFiles}
              isUploadingPhotos={isUploadingPhotos}
              onAddFiles={handleAddFiles}
              onRemove={removePhoto}
            />
          )}
          {step === 3 && (
            <ReviewSubmit
              form={form} photoFiles={photoFiles} coords={coords}
              onEdit={(s) => { setStep(s); setErrors({}); }}
            />
          )}
        </CardBody>

        <CardFooter className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => { setStep((s) => s - 1); setErrors({}); }} disabled={step === 0}>
            ← Back
          </Button>
          {step < STEP_TITLES.length - 1 ? (
            <Button onClick={nextStep} isLoading={isUploadingPhotos}>
              {isUploadingPhotos ? "Uploading…" : "Continue →"}
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              🚀 Submit Job
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
