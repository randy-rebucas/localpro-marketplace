"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/ui/Card";

const CATEGORIES = [
  "Plumbing", "Electrical", "Cleaning", "Landscaping", "Carpentry",
  "Painting", "Roofing", "HVAC", "Moving", "Handyman", "Other",
];

interface FormData {
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  scheduleDate: string;
}

const INITIAL: FormData = {
  title: "", category: "", description: "",
  budget: "", location: "", scheduleDate: "",
};

const STEPS = ["Job Details", "Budget & Schedule", "Review & Submit"];

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
              </div>
              <div>
                <label className="label block mb-1">Description</label>
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
                <label className="label block mb-1">Budget (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" min="1" className={`input w-full pl-7 ${errors.budget ? "border-red-400" : ""}`}
                    placeholder="500"
                    value={form.budget} onChange={(e) => update("budget", e.target.value)} />
                </div>
                {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget}</p>}
              </div>
              <div>
                <label className="label block mb-1">Location</label>
                <input className={`input w-full ${errors.location ? "border-red-400" : ""}`}
                  placeholder="e.g. 123 Main St, New York, NY"
                  value={form.location} onChange={(e) => update("location", e.target.value)} />
                {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
              </div>
              <div>
                <label className="label block mb-1">Preferred Date</label>
                <input type="datetime-local" className={`input w-full ${errors.scheduleDate ? "border-red-400" : ""}`}
                  value={form.scheduleDate} onChange={(e) => update("scheduleDate", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)} />
                {errors.scheduleDate && <p className="mt-1 text-xs text-red-500">{errors.scheduleDate}</p>}
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
                { label: "Budget", value: `$${form.budget}` },
                { label: "Location", value: form.location },
                { label: "Preferred Date", value: new Date(form.scheduleDate).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 text-sm">
                  <span className="font-medium text-slate-600 w-28 flex-shrink-0">{label}:</span>
                  <span className="text-slate-800 break-words">{value}</span>
                </div>
              ))}
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
