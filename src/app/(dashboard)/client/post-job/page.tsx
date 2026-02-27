"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import { Sparkles, LocateFixed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ICategory } from "@/types";

interface FormData {
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  scheduleDate: string;
  specialInstructions: string;
}

const INITIAL: FormData = {
  title: "", category: "", description: "",
  budget: "", location: "", scheduleDate: "", specialInstructions: "",
};

const STEPS = ["Job Details", "Budget & Schedule", "Review & Submit"];

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isGeolocating, setIsGeolocating] = useState(false);

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((data: ICategory[]) => setCategories(data.map((c) => c.name)))
      .catch(() => { /* silently fall back to empty list */ });
  }, []);

  async function detectLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsGeolocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 })
      );
      const { latitude: lat, longitude: lng } = position.coords;
      setCoords({ lat, lng });
      // Reverse geocode using Google Maps if available, else fall back to coords string
      if (typeof window !== "undefined" && window.google?.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });
        if (result.results[0]) {
          update("location", result.results[0].formatted_address);
        } else {
          update("location", `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } else {
        update("location", `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
      toast.success("Location detected!");
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 1) toast.error("Location access denied. Enable it in your browser settings.");
      else toast.error("Could not detect your location. Try typing it manually.");
    } finally {
      setIsGeolocating(false);
    }
  }

  async function generateDescription() {
    if (!form.title || form.title.trim().length < 3) {
      toast.error("Enter a job title first so AI knows what to write.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: form.title, category: form.category }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "AI generation failed"); return; }
      update("description", data.description);
    } catch {
      toast.error("Could not reach AI service.");
    } finally {
      setIsGenerating(false);
    }
  }

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validateStep0() {
    const errs: Partial<FormData> = {};
    if (!form.title || form.title.length < 5) errs.title = "Title must be at least 5 characters";
    if (!form.category) errs.category = "Please select a category";
    if (!form.description || form.description.length < 20) errs.description = "Description must be at least 20 characters";
    return errs;
  }

  function validateStep1() {
    const errs: Partial<FormData> = {};
    if (!form.budget || isNaN(Number(form.budget)) || Number(form.budget) < 1) {
      errs.budget = "Please enter a valid budget";
    }
    if (!form.location) errs.location = "Location is required";
    if (!form.scheduleDate) errs.scheduleDate = "Schedule date is required";
    return errs;
  }

  function nextStep() {
    const errs = step === 0 ? validateStep0() : validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
          scheduleDate: new Date(form.scheduleDate).toISOString(),
          ...(coords && {
            coordinates: {
              type: "Point" as const,
              coordinates: [coords.lng, coords.lat] as [number, number],
            },
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to post job"); return; }
      toast.success("Job posted! It will be reviewed by our team.");
      router.push("/client/jobs");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Post a Job</h2>
        <p className="text-slate-500 text-sm mt-0.5">Fill in the details below to find the right professional.</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-primary" : "text-slate-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">{STEPS[step]}</h3>
        </CardHeader>

        <CardBody className="space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="label block mb-1">Job Title</label>
                <input className={`input w-full ${errors.title ? "border-red-400" : ""}`}
                  placeholder="e.g. Fix leaking kitchen faucet"
                  value={form.title} onChange={(e) => update("title", e.target.value)} />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>
              <div>
                <label className="label block mb-1">Category</label>
                <select className={`input w-full ${errors.category ? "border-red-400" : ""}`}
                  value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">Description</label>
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? "animate-pulse" : ""}`} />
                    {isGenerating ? "Generating…" : "AI Generate"}
                  </button>
                </div>
                <textarea className={`input w-full min-h-[120px] resize-y ${errors.description ? "border-red-400" : ""}`}
                  placeholder="Describe the work needed in detail (what, where, any special requirements)..."
                  value={form.description} onChange={(e) => update("description", e.target.value)} />
                <div className="flex justify-between mt-1">
                  {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                  <p className="text-xs text-slate-400 ml-auto">{form.description.length} chars</p>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="label block mb-1">Budget (PHP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₱</span>
                  <input type="number" min="1" className={`input w-full pl-7 ${errors.budget ? "border-red-400" : ""}`}
                    placeholder="1000"
                    value={form.budget} onChange={(e) => update("budget", e.target.value)} />
                </div>
                {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">Location</label>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isGeolocating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <LocateFixed className={`h-3.5 w-3.5 ${isGeolocating ? "animate-spin" : ""}`} />
                    {isGeolocating ? "Detecting…" : "Use my location"}
                  </button>
                </div>
                <LocationAutocomplete
                  value={form.location}
                  onChange={(address, c) => {
                    update("location", address);
                    setCoords(c ?? null);
                  }}
                  error={errors.location}
                />
                {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
              </div>
              <div>
                <label className="label block mb-1">Preferred Date</label>
                <input type="datetime-local" className={`input w-full ${errors.scheduleDate ? "border-red-400" : ""}`}
                  value={form.scheduleDate} onChange={(e) => update("scheduleDate", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)} />
                {errors.scheduleDate && <p className="mt-1 text-xs text-red-500">{errors.scheduleDate}</p>}
              </div>
              <div>
                <label className="label block mb-1">
                  Special Instructions
                  <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  className="input w-full min-h-[80px] resize-y"
                  placeholder="e.g. Please call before arriving, dog on premises, use side entrance…"
                  value={form.specialInstructions}
                  onChange={(e) => update("specialInstructions", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Please review your job details before submitting.</p>
              {[
                { label: "Title", value: form.title },
                { label: "Category", value: form.category },
                { label: "Description", value: form.description },
                { label: "Budget", value: formatCurrency(Number(form.budget)) },
                { label: "Location", value: form.location },
                { label: "Preferred Date", value: new Date(form.scheduleDate).toLocaleString() },
                ...(form.specialInstructions ? [{ label: "Special Instructions", value: form.specialInstructions }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 text-sm">
                  <span className="font-medium text-slate-600 w-28 flex-shrink-0">{label}:</span>
                  <span className="text-slate-800 break-words">{value}</span>
                </div>
              ))}

              {/* Map preview */ }
              {coords && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=16&size=640x180&markers=color:red%7Clabel:P%7C${coords.lat},${coords.lng}&scale=2&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                    alt="Job location map"
                    className="w-full h-[150px] object-cover"
                  />
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
                    <span className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                      Coordinates captured
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 mt-4">
                Your job will be reviewed by our admin team before being published to providers.
              </div>
            </div>
          )}
        </CardBody>

        <CardFooter className="flex justify-between">
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            Back
          </Button>
          {step < 2 ? (
            <Button onClick={nextStep}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              Submit Job
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
