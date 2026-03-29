"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  ArrowLeft, Loader2, Star, MapPin, CalendarDays, PhoneCall,
  Banknote, Tag, Briefcase, FileText, Gift, ClipboardList, Info,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import MdEditor from "@/components/ui/MdEditor";

marked.setOptions({ breaks: true });

const JOB_TAGS = [
  { value: "peso",        label: "PESO Job",           color: "bg-blue-100 text-blue-700" },
  { value: "lgu_project", label: "LGU Project",         color: "bg-green-100 text-green-700" },
  { value: "gov_program", label: "Government Program",  color: "bg-purple-100 text-purple-700" },
  { value: "emergency",   label: "Emergency",           color: "bg-red-100 text-red-700" },
  { value: "internship",  label: "Internship",          color: "bg-amber-100 text-amber-700" },
] as const;

const TAG_COLOR: Record<string, string> = Object.fromEntries(
  JOB_TAGS.map(({ value, color }) => [value, color])
);

const EMPTY_FORM = {
  jobSource: "peso" as "peso" | "lgu",
  category: "",
  title: "",
  description: "",
  qualifications: "",
  whatWeOffer: "",
  howToApply: "",
  contactNumber: "",
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

function md(src: string) {
  return src ? DOMPurify.sanitize(marked(src) as string) : "";
}

function PreviewSection({
  icon,
  title,
  html,
}: {
  icon: React.ReactNode;
  title: string;
  html: string;
}) {
  if (!html) return null;
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {icon}
        {title}
      </h3>
      <div
        className="prose prose-sm max-w-none text-slate-700
          prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1
          prose-headings:text-slate-800 prose-headings:font-semibold"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

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
      // Compose the structured description from all rich-text sections
      const sections: string[] = [form.description.trim()];
      if (form.qualifications.trim()) {
        sections.push(`## Qualifications\n${form.qualifications.trim()}`);
      }
      if (form.whatWeOffer.trim()) {
        sections.push(`## What We Offer\n${form.whatWeOffer.trim()}`);
      }
      if (form.howToApply.trim()) {
        sections.push(`## How to Apply\n${form.howToApply.trim()}`);
      }
      const composedDescription = sections.join("\n\n");

      // Append contact number to special instructions
      const composedInstructions = [
        form.specialInstructions.trim(),
        form.contactNumber.trim() ? `Contact: ${form.contactNumber.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Auto-sync jobTags to match jobSource
      const sourceTags = form.jobSource === "lgu" ? ["lgu_project"] : ["peso"];
      const otherTags  = form.jobTags.filter((t) => t !== "peso" && t !== "lgu_project");
      const finalTags  = [...new Set([...sourceTags, ...otherTags])];

      const res = await apiFetch("/api/peso/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category:            form.category,
          title:               form.title,
          description:         composedDescription,
          budget:              form.budget ? Number(form.budget) : undefined,
          location:            form.location,
          scheduleDate:        form.scheduleDate || undefined,
          specialInstructions: composedInstructions || undefined,
          jobTags:             finalTags,
          isPriority:          form.isPriority,
          jobSource:           form.jobSource,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? "Failed to post job");
      }
      toast.success("Job posted successfully");
      router.push("/peso/jobs");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const hasPreview =
    form.title || form.description || form.qualifications ||
    form.whatWeOffer || form.howToApply || form.location;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/peso/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Job Board
        </Link>
        <h1 className="text-xl font-bold text-slate-800">
          Post a {form.jobSource === "lgu" ? "LGU / Government" : "PESO"} Job
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {form.jobSource === "lgu"
            ? "Post an LGU or government-funded job to the LocalPro marketplace."
            : "Post a government job to the LocalPro marketplace."}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left: Form ── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
        >
          {/* Job Source toggle */}
          <div>
            <label className={LABEL_CLS}>Posting As</label>
            <div className="flex gap-3 mt-2">
              {(["peso", "lgu"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setForm((f) => {
                    const otherTags = f.jobTags.filter((t) => t !== "peso" && t !== "lgu_project");
                    const sourceTag = src === "lgu" ? "lgu_project" : "peso";
                    return { ...f, jobSource: src, jobTags: [sourceTag, ...otherTags] };
                  })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    form.jobSource === src
                      ? src === "lgu"
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-sky-600 text-white border-sky-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {src === "peso" ? "🏛️ PESO Office" : "🏛️ LGU / Government"}
                </button>
              ))}
            </div>
          </div>
          {/* Category */}
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
            <MdEditor
              required
              minLength={20}
              rows={4}
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Describe the job scope, requirements, and expected output…"
            />
          </div>

          {/* Qualifications */}
          <div>
            <label className={LABEL_CLS}>
              Qualifications <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <MdEditor
              required
              minLength={10}
              rows={3}
              value={form.qualifications}
              onChange={(v) => setForm((f) => ({ ...f, qualifications: v }))}
              placeholder="e.g. At least 18 years old, physically fit, willing to work outdoors…"
            />
          </div>

          {/* What We Offer */}
          <div>
            <label className={LABEL_CLS}>
              What We Offer <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <MdEditor
              required
              minLength={5}
              rows={3}
              value={form.whatWeOffer}
              onChange={(v) => setForm((f) => ({ ...f, whatWeOffer: v }))}
              placeholder="e.g. Daily wage ₱610, free lunch, certificate of employment…"
            />
          </div>

          {/* How to Apply */}
          <div>
            <label className={LABEL_CLS}>
              How to Apply <span className="text-red-400 normal-case font-normal">*</span>
            </label>
            <MdEditor
              required
              minLength={5}
              rows={3}
              value={form.howToApply}
              onChange={(v) => setForm((f) => ({ ...f, howToApply: v }))}
              placeholder="e.g. Visit the PESO office or apply via LocalPro before March 15…"
            />
          </div>

          {/* Location + Contact */}
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
                Contact Number{" "}
                <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.contactNumber}
                onChange={set("contactNumber")}
                placeholder="e.g. 09XX-XXX-XXXX"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Budget + Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>
                Budget (₱){" "}
                <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.budget}
                onChange={set("budget")}
                placeholder="e.g. 5000 — leave blank if TBD"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                Schedule Date{" "}
                <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
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
            <MdEditor
              rows={2}
              value={form.specialInstructions}
              onChange={(v) => setForm((f) => ({ ...f, specialInstructions: v }))}
              placeholder="Any additional notes for providers…"
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

        {/* ── Right: Sticky live preview ── */}
        <div className="w-[380px] shrink-0 sticky top-6">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 pl-1">
            Live Preview
          </p>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {!hasPreview ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-2">
                <Briefcase className="h-8 w-8" />
                <p className="text-xs">Start filling the form to see a preview</p>
              </div>
            ) : (
              <>
                {/* Header band */}
                <div className={`px-5 pt-5 pb-4 bg-gradient-to-br ${
                  form.jobSource === "lgu"
                    ? "from-teal-600 to-teal-700"
                    : "from-blue-600 to-blue-700"
                }`}>
                  {/* Source + Priority badges */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      form.jobSource === "lgu"
                        ? "bg-teal-100 text-teal-800"
                        : "bg-sky-100 text-sky-800"
                    }`}>
                      🏛️ {form.jobSource === "lgu" ? "LGU" : "PESO"}
                    </span>
                    {form.isPriority && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                        <Star className="h-2.5 w-2.5 fill-amber-900" />
                        Priority
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug">
                    {form.title || <span className="opacity-40 italic font-normal">Job title…</span>}
                  </h2>
                  {form.category && (
                    <p className="text-xs text-white/70 mt-0.5">{form.category}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-white/60">
                    {form.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {form.location}
                      </span>
                    )}
                    {form.budget && (
                      <span className="flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        ₱{Number(form.budget).toLocaleString()}
                      </span>
                    )}
                    {form.scheduleDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(form.scheduleDate).toLocaleDateString("en-PH", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    )}
                    {form.contactNumber && (
                      <span className="flex items-center gap-1">
                        <PhoneCall className="h-3 w-3" />
                        {form.contactNumber}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {form.jobTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {form.jobTags.map((t) => (
                        <span
                          key={t}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLOR[t] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {JOB_TAGS.find((j) => j.value === t)?.label ?? t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4 text-sm">
                  <PreviewSection
                    icon={<FileText className="h-3.5 w-3.5" />}
                    title="Description"
                    html={md(form.description)}
                  />
                  <PreviewSection
                    icon={<ClipboardList className="h-3.5 w-3.5" />}
                    title="Qualifications"
                    html={md(form.qualifications)}
                  />
                  <PreviewSection
                    icon={<Gift className="h-3.5 w-3.5" />}
                    title="What We Offer"
                    html={md(form.whatWeOffer)}
                  />
                  <PreviewSection
                    icon={<Tag className="h-3.5 w-3.5" />}
                    title="How to Apply"
                    html={md(form.howToApply)}
                  />
                  <PreviewSection
                    icon={<Info className="h-3.5 w-3.5" />}
                    title="Special Instructions"
                    html={md(form.specialInstructions)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

