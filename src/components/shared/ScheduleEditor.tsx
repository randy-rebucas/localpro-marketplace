"use client";

import type { DayOfWeek, WeeklySchedule, WorkSlot } from "@/types";

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "mon", label: "Monday",    short: "Mon" },
  { key: "tue", label: "Tuesday",   short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday",  short: "Thu" },
  { key: "fri", label: "Friday",    short: "Fri" },
  { key: "sat", label: "Saturday",  short: "Sat" },
  { key: "sun", label: "Sunday",    short: "Sun" },
];

interface ScheduleEditorProps {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export default function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
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
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              enabled ? "bg-white" : "bg-slate-50"
            }`}
          >
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
              className={`w-24 text-sm font-medium select-none ${
                enabled ? "text-slate-800" : "text-slate-400"
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </span>

            {/* Time range */}
            {enabled ? (
              <div className="flex items-center gap-2 flex-1">
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
                <span className="hidden sm:inline text-xs text-slate-400 ml-1">
                  {formatHours(slot.from, slot.to)}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-400 italic">Unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Returns "X hrs" between two HH:MM strings, or empty string if invalid. */
function formatHours(from: string, to: string): string {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if (isNaN(fh) || isNaN(th)) return "";
  const mins = th * 60 + tm - (fh * 60 + fm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr${h !== 1 ? "s" : ""}` : `${h}h ${m}m`;
}
