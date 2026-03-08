"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

const JOB_TAGS = [
  { value: "peso",        label: "PESO Job" },
  { value: "lgu_project", label: "LGU Project" },
  { value: "gov_program", label: "Government Program" },
  { value: "emergency",   label: "Emergency" },
  { value: "internship",  label: "Internship" },
] as const;

const EMPTY_FORM = {
  category: "",
  title: "",
  description: "",
  budget: "",
  location: "",
  scheduleDate: "",
  specialInstructions: "",
  jobTags: ["peso"] as string[],
  isPriority: false,
};

const INPUT_CLS =
  "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-400 transition";

const LABEL_CLS = "text-xs font-semibold text-slate-500 uppercase tracking-wide";

export default function PostPesoJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      jobTags: f.jobTags.includes(tag)
        ? f.jobTags.filter((t) => t !== tag)
        : [...f.jobTags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/peso/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, budget: Number(form.budget) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to post job");
      }

      toast.success("Job posted successfully");
      router.push("/peso/jobs");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/peso/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Job Board
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Post a PESO Job</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Post a government job to the LocalPro marketplace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Category + Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>
              Category <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              required
              value={form.category}
              onChange={set("category")}
              placeholder="e.g. Cleaning, Maintenance"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              Budget (₱) <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              required
              type="number"
              min={1}
              step={1}
              value={form.budget}
              onChange={set("budget")}
              placeholder="e.g. 5000"
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={LABEL_CLS}>
            Job Title <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <input
            required
            minLength={5}
            value={form.title}
            onChange={set("title")}
            placeholder="e.g. City Park Cleanup Crew"
            className={INPUT_CLS}
          />
        </div>

        {/* Description */}
        <div>
          <label className={LABEL_CLS}>
            Description <span className="text-red-400 normal-case font-normal">*</span>
          </label>
          <textarea
            required
            minLength={20}
            rows={4}
            value={form.description}
            onChange={set("description")}
            placeholder="Describe the job scope, requirements, and expected output…"
            className={`${INPUT_CLS} resize-y`}
          />
        </div>

        {/* Location + Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>
              Location <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              required
              value={form.location}
              onChange={set("location")}
              placeholder="e.g. Brgy. Poblacion, Malolos"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              Schedule Date <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <input
              required
              type="date"
              value={form.scheduleDate}
              onChange={set("scheduleDate")}
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Job Tags */}
        <div>
          <label className={LABEL_CLS}>Job Tags</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {JOB_TAGS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleTag(value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  form.jobTags.includes(value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority toggle */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              id="isPriority"
              type="checkbox"
              checked={form.isPriority}
              onChange={(e) => setForm((f) => ({ ...f, isPriority: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              Mark as Priority
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Pinned to the top of the marketplace feed</p>
          </div>
        </label>

        {/* Special Instructions */}
        <div>
          <label className={LABEL_CLS}>
            Special Instructions{" "}
            <span className="normal-case font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={form.specialInstructions}
            onChange={set("specialInstructions")}
            placeholder="Any additional notes for providers…"
            className={`${INPUT_CLS} resize-y`}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Posting…" : "Post Job"}
          </button>
          <Link
            href="/peso/jobs"
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
