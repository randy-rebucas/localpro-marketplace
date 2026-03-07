"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const JOB_TAGS = [
  { value: "peso",        label: "PESO Job" },
  { value: "lgu_project", label: "LGU Project" },
  { value: "gov_program", label: "Government Program" },
  { value: "emergency",   label: "Emergency" },
  { value: "internship",  label: "Internship" },
] as const;

export default function PostPesoJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "",
    title: "",
    description: "",
    budget: "",
    location: "",
    scheduleDate: "",
    specialInstructions: "",
    jobTags: ["peso"] as string[],
    isPriority: false,
  });

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
      const res = await fetch("/api/peso/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
        }),
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
      <div>
        <h1 className="text-xl font-bold text-slate-800">Post a PESO Job</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Post a government job to the LocalPro marketplace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
            <input
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Cleaning, Maintenance"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Budget (₱)</label>
            <input
              required
              type="number"
              min={1}
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder="e.g. 5000"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job Title</label>
          <input
            required
            minLength={5}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. City Park Cleanup Crew"
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
          <textarea
            required
            minLength={20}
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Describe the job scope, requirements, and expected output..."
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Brgy. Poblacion, Malolos"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Schedule Date</label>
            <input
              required
              type="date"
              value={form.scheduleDate}
              onChange={(e) => setForm((f) => ({ ...f, scheduleDate: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job Tags</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {JOB_TAGS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleTag(value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  form.jobTags.includes(value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isPriority"
            type="checkbox"
            checked={form.isPriority}
            onChange={(e) => setForm((f) => ({ ...f, isPriority: e.target.checked }))}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="isPriority" className="text-sm text-slate-700">
            Mark as Priority (pinned to top of marketplace)
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Special Instructions (optional)</label>
          <textarea
            rows={2}
            value={form.specialInstructions}
            onChange={(e) => setForm((f) => ({ ...f, specialInstructions: e.target.value }))}
            placeholder="Any additional notes for providers..."
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Posting..." : "Post Job"}
        </button>
      </form>
    </div>
  );
}
