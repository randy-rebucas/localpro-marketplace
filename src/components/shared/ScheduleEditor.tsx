"use client";

import { useTranslations } from "next-intl";
import type { DayOfWeek, WeeklySchedule, WorkSlot } from "@/types";

type TFunc = ReturnType<typeof useTranslations>;

function getDays(t: TFunc): { key: DayOfWeek; label: string; short: string }[] {
  return [
    { key: "mon", label: t("monLabel"), short: t("monShort") },
    { key: "tue", label: t("tueLabel"), short: t("tueShort") },
    { key: "wed", label: t("wedLabel"), short: t("wedShort") },
    { key: "thu", label: t("thuLabel"), short: t("thuShort") },
    { key: "fri", label: t("friLabel"), short: t("friShort") },
    { key: "sat", label: t("satLabel"), short: t("satShort") },
    { key: "sun", label: t("sunLabel"), short: t("sunShort") },
  ];
}

interface ScheduleEditorProps {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export default function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const t    = useTranslations("scheduleEditor");
  const DAYS = getDays(t);

  function updateSlot(day: DayOfWeek, patch: Partial<WorkSlot>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
      {DAYS.map(({ key, label, short }) => {
        const slot = value[key];
        const enabled = slot?.enabled ?? false;

        return (
          <div
            key={key}
            className={`px-4 py-3 transition-colors ${enabled ? "bg-white" : "bg-slate-50"}`}
          >
            {/* Top row: toggle + day label (+ "Unavailable" when off) */}
            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => updateSlot(key, { enabled: !enabled })}
                className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  enabled ? "bg-primary" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Day label */}
              <span
                className={`w-20 sm:w-24 text-sm font-medium select-none flex-shrink-0 ${
                  enabled ? "text-slate-800" : "text-slate-400"
                }`}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </span>

              {/* On sm+: show time pickers inline */}
              {enabled ? (
                <div className="hidden sm:flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={slot.from}
                    onChange={(e) => updateSlot(key, { from: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <span className="text-slate-400 text-sm">–</span>
                  <input
                    type="time"
                    value={slot.to}
                    min={slot.from}
                    onChange={(e) => updateSlot(key, { to: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <span className="text-xs text-slate-400 ml-1">
                    {formatHours(slot.from, slot.to, t)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">{t("unavailable")}</span>
              )}
            </div>

            {/* Mobile: time pickers on a second row, indented under day label */}
            {enabled && (
              <div className="sm:hidden flex items-center gap-2 mt-2 pl-12">
                <input
                  type="time"
                  value={slot.from}
                  onChange={(e) => updateSlot(key, { from: e.target.value })}
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <span className="text-slate-400 text-sm flex-shrink-0">–</span>
                <input
                  type="time"
                  value={slot.to}
                  min={slot.from}
                  onChange={(e) => updateSlot(key, { to: e.target.value })}
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {formatHours(slot.from, slot.to, t) && (
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatHours(slot.from, slot.to, t)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Returns translated hour string between two HH:MM strings, or empty string if invalid. */
function formatHours(from: string, to: string, t: TFunc): string {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if (isNaN(fh) || isNaN(th)) return "";
  const mins = th * 60 + tm - (fh * 60 + fm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? t("hours", { n: h }) : t("hoursPlural", { n: h });
  return t("hoursMinutes", { h, m });
}
