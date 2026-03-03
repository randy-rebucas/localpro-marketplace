import dynamic from "next/dynamic";
import { Sparkles, LocateFixed, Info } from "lucide-react";
import type { FormData, BudgetHint } from "../types";

const LocationAutocomplete = dynamic(
  () => import("@/components/shared/LocationAutocomplete"),
  {
    ssr: false,
    loading: () => <input className="input w-full" placeholder="Loading location search…" disabled />,
  }
);

interface Props {
  form: FormData;
  errors: Partial<FormData>;
  budgetHint: BudgetHint | null;
  isEstimatingBudget: boolean;
  isGeolocating: boolean;
  onEstimateBudget: () => void;
  onDetectLocation: () => void;
  update: (field: keyof FormData, value: string) => void;
  setCoords: (c: { lat: number; lng: number } | null) => void;
  setBudgetHint: (h: BudgetHint | null) => void;
}

const AI_BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

const GEO_BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export function BudgetSchedule({
  form, errors, budgetHint,
  isEstimatingBudget, isGeolocating,
  onEstimateBudget, onDetectLocation,
  update, setCoords, setBudgetHint,
}: Props) {
  const budgetNum = Number(form.budget);

  return (
    <div className="space-y-5">
      {/* Contextual tip */}
      <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
        <Info className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700 leading-relaxed">
          <span className="font-semibold">Set a realistic budget</span> — providers filter by it. Not sure? Use <span className="font-semibold">Estimate with AI</span> to get a suggested range based on your job.
        </p>
      </div>

      {/* Budget */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label font-medium text-slate-700">Budget (PHP)</label>
          <button type="button" onClick={onEstimateBudget} disabled={isEstimatingBudget} className={AI_BTN}>
            <Sparkles className={`h-3.5 w-3.5 ${isEstimatingBudget ? "animate-pulse" : ""}`} />
            {isEstimatingBudget ? "Estimating…" : "Estimate with AI"}
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium select-none">₱</span>
          <input
            type="number" min="1"
            className={`input w-full pl-8 ${errors.budget ? "border-red-400" : ""}`}
            placeholder="e.g. 1500"
            value={form.budget}
            onChange={(e) => { update("budget", e.target.value); setBudgetHint(null); }}
          />
        </div>

        {/* AI budget hint */}
        {budgetHint && (
          <div className="mt-2 rounded-xl bg-violet-50 border border-violet-200 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-violet-800">AI Suggested Range</p>
              <p className="text-xs text-violet-500 tabular-nums">
                ₱{budgetHint.min.toLocaleString()} – ₱{budgetHint.max.toLocaleString()}
              </p>
            </div>
            {/* Range bar */}
            <div className="relative h-2 bg-violet-100 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-300 to-violet-500 rounded-full" />
              {budgetNum > 0 && (
                <div
                  className="absolute top-0 h-full w-1 bg-white rounded-full shadow"
                  style={{
                    left: `${Math.min(Math.max(((budgetNum - budgetHint.min) / (budgetHint.max - budgetHint.min)) * 100, 0), 100)}%`,
                  }}
                />
              )}
            </div>
            {budgetHint.note && <p className="text-xs text-violet-600 italic">{budgetHint.note}</p>}
            <button
              type="button"
              onClick={() => { update("budget", String(budgetHint.midpoint)); setBudgetHint(null); }}
              className="w-full rounded-lg bg-violet-600 text-white text-xs font-semibold py-1.5 hover:bg-violet-700 transition-colors"
            >
              Use midpoint — ₱{budgetHint.midpoint.toLocaleString()}
            </button>
          </div>
        )}
        {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget}</p>}
      </div>

      {/* Location */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label font-medium text-slate-700">Service Location</label>
          <button type="button" onClick={onDetectLocation} disabled={isGeolocating} className={GEO_BTN}>
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

      {/* Preferred date */}
      <div>
        <label className="label block mb-1 font-medium text-slate-700">Preferred Date & Time</label>
        <input
          type="datetime-local"
          className={`input w-full ${errors.scheduleDate ? "border-red-400" : ""}`}
          value={form.scheduleDate}
          onChange={(e) => update("scheduleDate", e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
        {errors.scheduleDate
          ? <p className="mt-1 text-xs text-red-500">{errors.scheduleDate}</p>
          : <p className="mt-1 text-xs text-slate-400">Providers will confirm or suggest an alternative time.</p>}
      </div>

      {/* Special instructions */}
      <div>
        <label className="label block mb-1 font-medium text-slate-700">
          Special Instructions
          <span className="ml-1.5 text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          className="input w-full min-h-[80px] resize-y"
          placeholder="e.g. Call before arriving · dog on premises · use the side entrance · bring own tools…"
          value={form.specialInstructions}
          onChange={(e) => update("specialInstructions", e.target.value)}
        />
      </div>
    </div>
  );
}
