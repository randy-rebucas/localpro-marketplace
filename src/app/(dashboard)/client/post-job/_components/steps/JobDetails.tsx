import { Sparkles, Lightbulb } from "lucide-react";
import type { FormData } from "../types";
import type { ICategory } from "@/types";

interface Props {
  form: FormData;
  errors: Partial<FormData>;
  categories: ICategory[];
  isGenerating: boolean;
  isClassifying: boolean;
  update: (field: keyof FormData, value: string) => void;
  onGenerateDescription: () => void;
  onClassifyCategory: () => void;
}

const AI_BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export function JobDetails({
  form, errors, categories,
  isGenerating, isClassifying,
  update, onGenerateDescription, onClassifyCategory,
}: Props) {
  const charCount = form.description.length;
  const charMax   = 1000;
  const charFill  = Math.min((charCount / charMax) * 100, 100);
  const charColor = charCount < 200 ? "bg-red-400" : charCount < 500 ? "bg-amber-400" : "bg-green-400";

  return (
    <div className="space-y-5">
      {/* Contextual tip */}
      <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">Tip:</span> A detailed description gets you <span className="font-semibold">3× more quotes</span>. Use AI to generate one from your title, then refine it.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="label block mb-1 font-medium text-slate-700">Job Title</label>
        <input
          className={`input w-full ${errors.title ? "border-red-400 focus:ring-red-200" : ""}`}
          placeholder="e.g. Fix leaking kitchen faucet"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />
        {errors.title
          ? <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          : <p className="mt-1 text-xs text-slate-400">Be specific — &ldquo;Fix leaking faucet in kitchen&rdquo; beats &ldquo;plumbing work&rdquo;</p>}
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label font-medium text-slate-700">Service Category</label>
          <button type="button" onClick={onClassifyCategory} disabled={isClassifying} className={AI_BTN}>
            <Sparkles className={`h-3.5 w-3.5 ${isClassifying ? "animate-pulse" : ""}`} />
            {isClassifying ? "Detecting…" : "Auto-detect"}
          </button>
        </div>
        <select
          className={`input w-full ${errors.category ? "border-red-400" : ""}`}
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">Select a category…</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
          ))}
        </select>
        {(() => {
          const sel = categories.find((c) => c.name === form.category);
          return sel?.description ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
              <span className="mt-0.5 text-base leading-none">{sel.icon}</span>
              {sel.description}
            </p>
          ) : null;
        })()}
        {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label font-medium text-slate-700">Description</label>
          <button type="button" onClick={onGenerateDescription} disabled={isGenerating} className={AI_BTN}>
            <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? "animate-pulse" : ""}`} />
            {isGenerating ? "Generating…" : "AI Generate"}
          </button>
        </div>
        <textarea
          className={`input w-full min-h-[130px] resize-y ${errors.description ? "border-red-400" : ""}`}
          placeholder="Describe the work needed in detail — what, where, any special requirements or concerns…"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
        {/* Character meter */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${charColor}`} style={{ width: `${charFill}%` }} />
          </div>
          <span className={`text-xs tabular-nums ${charCount < 20 ? "text-red-400" : "text-slate-400"}`}>
            {charCount} / {charMax}
          </span>
        </div>
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
      </div>
    </div>
  );
}
