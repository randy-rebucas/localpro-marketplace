import dynamic from "next/dynamic";
import { Sparkles, LocateFixed, Info, Zap, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormData, BudgetHint } from "../types";
import MdEditor from "@/components/ui/MdEditor";
import { DEFAULT_URGENCY_FEE_SAME_DAY, DEFAULT_URGENCY_FEE_RUSH } from "@/lib/commission";

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
  const t = useTranslations("clientPages");
  const budgetNum = Number(form.budget);

  return (
    <div className="space-y-5">
      {/* Contextual tip */}
      <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
        <Info className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700 leading-relaxed">
          <span className="font-semibold">{t("postJob_budgetTip")}</span>
        </p>
      </div>

      {/* Budget */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label font-medium text-slate-700">{t("postJob_budgetLabel")}</label>
          <button type="button" onClick={onEstimateBudget} disabled={isEstimatingBudget} className={AI_BTN}>
            <Sparkles className={`h-3.5 w-3.5 ${isEstimatingBudget ? "animate-pulse" : ""}`} />
            {isEstimatingBudget ? t("postJob_estimating") : t("postJob_estimateAI")}
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
              <p className="text-xs font-semibold text-violet-800">{t("postJob_aiBudgetRange")}</p>
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
              {t("postJob_aiMidpoint", { amount: budgetHint.midpoint.toLocaleString() })}
            </button>
          </div>
        )}
        {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget}</p>}
      </div>

      {/* Location */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label font-medium text-slate-700">{t("postJob_locationLabel")}</label>
          <button type="button" onClick={onDetectLocation} disabled={isGeolocating} className={GEO_BTN}>
            <LocateFixed className={`h-3.5 w-3.5 ${isGeolocating ? "animate-spin" : ""}`} />
            {isGeolocating ? t("postJob_detecting") : t("postJob_useMyLocation")}
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
        <label className="label block mb-1 font-medium text-slate-700">{t("postJob_dateLabel")}</label>
        <input
          type="datetime-local"
          className={`input w-full ${errors.scheduleDate ? "border-red-400" : ""}`}
          value={form.scheduleDate}
          onChange={(e) => update("scheduleDate", e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
        {errors.scheduleDate
          ? <p className="mt-1 text-xs text-red-500">{errors.scheduleDate}</p>
          : <p className="mt-1 text-xs text-slate-400">{t("postJob_providersConfirmTime")}</p>}
      </div>

      {/* Special instructions */}
      <div>
        <label className="label block mb-1 font-medium text-slate-700">
          {t("postJob_instructionsLabel")}
          <span className="ml-1.5 text-xs font-normal text-slate-400">{t("postJob_optionalSuffix")}</span>
        </label>
        <MdEditor
          value={form.specialInstructions}
          onChange={(v) => update("specialInstructions", v)}
          placeholder="e.g. Call before arriving · dog on premises · use the side entrance · bring own tools…"
          rows={4}
        />
      </div>

      {/* Urgency selector */}
      <div>
        <label className="label block mb-2 font-medium text-slate-700">
          {t("postJob_urgencyLabel")}
          <span className="ml-1.5 text-xs font-normal text-slate-400">{t("postJob_optionalFeeSuffix")}</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { value: "standard", label: t("postJob_urgencyStandard"),  icon: null,                fee: 0,                            desc: t("postJob_urgencyFlexible") },
            { value: "same_day", label: t("postJob_urgencySameDay"),   icon: <Zap  className="h-4 w-4 text-amber-500" />, fee: DEFAULT_URGENCY_FEE_SAME_DAY, desc: t("postJob_urgencyFeeNote", { fee: DEFAULT_URGENCY_FEE_SAME_DAY }) },
            { value: "rush",     label: t("postJob_urgencyRush"),      icon: <Clock className="h-4 w-4 text-red-500" />,  fee: DEFAULT_URGENCY_FEE_RUSH,     desc: t("postJob_urgencyFeeNote", { fee: DEFAULT_URGENCY_FEE_RUSH }) },
          ] as const).map(({ value, label, icon, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("urgency", value)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${
                form.urgency === value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {icon}
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
