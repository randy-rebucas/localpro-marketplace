"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { X, Sparkles, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import { formatCurrency } from "@/lib/utils";
import type { ICategory } from "@/types";

interface Props {
  providerId: string;
  providerName: string;
  onClose: () => void;
}

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
  title: "",
  category: "",
  description: "",
  budget: "",
  location: "",
  scheduleDate: "",
  specialInstructions: "",
};

export default function DirectJobModal({ providerId, providerName, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((data: ICategory[]) => setCategories(data.map((c) => c.name)))
      .catch(() => {});
  }, []);

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function generateDescription() {
    if (!form.title || form.title.trim().length < 3) {
      toast.error("Enter a job title first.");
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

  function validateStep0(): Partial<FormData> {
    const errs: Partial<FormData> = {};
    if (!form.title || form.title.length < 5) errs.title = "Title needs at least 5 characters";
    if (!form.category) errs.category = "Please select a category";
    if (!form.description || form.description.length < 20)
      errs.description = "Description needs at least 20 characters";
    return errs;
  }

  function validateStep1(): Partial<FormData> {
    const errs: Partial<FormData> = {};
    if (!form.budget || isNaN(Number(form.budget)) || Number(form.budget) < 1)
      errs.budget = "Enter a valid budget";
    if (!form.location) errs.location = "Location is required";
    if (!form.scheduleDate) errs.scheduleDate = "Schedule date is required";
    return errs;
  }

  function next() {
    const errs = step === 0 ? validateStep0() : validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  }

  async function submit() {
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
          invitedProviderId: providerId,
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
      toast.success(`Job posted! ${providerName} will be assigned once an admin approves it.`);
      onClose();
      router.push("/client/jobs");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const STEPS = ["Job Details", "Budget & Schedule", "Review"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Post Job Directly</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-primary font-medium">For {providerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2 flex-shrink-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="label block mb-1">Job Title</label>
                <input
                  className={`input w-full ${errors.title ? "border-red-400" : ""}`}
                  placeholder="e.g. Fix leaking kitchen faucet"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>

              <div>
                <label className="label block mb-1">Category</label>
                <select
                  className={`input w-full ${errors.category ? "border-red-400" : ""}`}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? "animate-pulse" : ""}`} />
                    {isGenerating ? "Generating…" : "AI Generate"}
                  </button>
                </div>
                <textarea
                  className={`input w-full min-h-[100px] resize-none ${errors.description ? "border-red-400" : ""}`}
                  placeholder="Describe the work needed in detail…"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
              </div>

              <div>
                <label className="label block mb-1">Special Instructions</label>
                <textarea
                  className="input w-full min-h-[72px] resize-none"
                  placeholder="Any special requirements? (optional)"
                  value={form.specialInstructions}
                  onChange={(e) => update("specialInstructions", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="label block mb-1">Budget (PHP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₱</span>
                  <input
                    type="number"
                    min="1"
                    className={`input w-full pl-7 ${errors.budget ? "border-red-400" : ""}`}
                    placeholder="0"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                  />
                </div>
                {form.budget && !isNaN(Number(form.budget)) && (
                  <p className="text-xs text-slate-400 mt-1">{formatCurrency(Number(form.budget))}</p>
                )}
                {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget}</p>}
              </div>

              <div>
                <label className="label block mb-1">Location</label>
                <LocationAutocomplete
                  value={form.location}
                  onChange={(val, c) => { update("location", val); if (c) setCoords(c); }}
                />
                {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
              </div>

              <div>
                <label className="label block mb-1">Schedule Date</label>
                <input
                  type="datetime-local"
                  className={`input w-full ${errors.scheduleDate ? "border-red-400" : ""}`}
                  value={form.scheduleDate}
                  onChange={(e) => update("scheduleDate", e.target.value)}
                />
                {errors.scheduleDate && <p className="mt-1 text-xs text-red-500">{errors.scheduleDate}</p>}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Direct invite to {providerName}</p>
                </div>
                <p className="text-xs text-slate-500">
                  Once admin approves this job, it will be automatically assigned to {providerName} —
                  no open marketplace bidding.
                </p>
              </div>

              {[
                { label: "Title", value: form.title },
                { label: "Category", value: form.category },
                { label: "Budget", value: formatCurrency(Number(form.budget)) },
                { label: "Location", value: form.location },
                { label: "Schedule", value: new Date(form.scheduleDate).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-800 text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}

              {form.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line line-clamp-4">{form.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-3 border-t border-slate-100 flex-shrink-0">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}

          {step < 2 ? (
            <Button onClick={next} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={submit} isLoading={isSubmitting} className="flex-1">
              Post Job
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
