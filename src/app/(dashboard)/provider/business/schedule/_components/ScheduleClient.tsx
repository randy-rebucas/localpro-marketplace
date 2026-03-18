"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarDays, Save, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  day: number;
  open: boolean;
  startTime: string;
  endTime: string;
}

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function slotDuration(s: Slot): string {
  const mins = toMins(s.endTime) - toMins(s.startTime);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}
function hasSlotError(s: Slot): boolean {
  if (!s.open) return false;
  return toMins(s.endTime) <= toMins(s.startTime);
}

const DEFAULT_SLOTS: Slot[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: day >= 1 && day <= 5,
  startTime: "08:00",
  endTime: "17:00",
}));

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleClient() {
  const t = useTranslations("providerPages");
  const DAY_NAMES = [
    t("provSchedule_daySun"), t("provSchedule_dayMon"), t("provSchedule_dayTue"),
    t("provSchedule_dayWed"), t("provSchedule_dayThu"), t("provSchedule_dayFri"), t("provSchedule_daySat"),
  ];
  const DAY_SHORT = [
    t("provSchedule_dayShortSun"), t("provSchedule_dayShortMon"), t("provSchedule_dayShortTue"),
    t("provSchedule_dayShortWed"), t("provSchedule_dayShortThu"), t("provSchedule_dayShortFri"), t("provSchedule_dayShortSat"),
  ];
  const [slots, setSlots]     = useState<Slot[]>(DEFAULT_SLOTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  const hasErrors = slots.some((s) => hasSlotError(s));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<{ availability: Slot[] }>("/api/provider/agency/schedule");
      setSlots(data.availability);
    } catch {
      toast.error(t("provSchedule_toastFailLoad"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(day: number, changes: Partial<Slot>) {
    setSlots((prev) => prev.map((s) => (s.day === day ? { ...s, ...changes } : s)));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetchClient("/api/provider/agency/schedule", {
        method: "PATCH",
        body: JSON.stringify({ availability: slots }),
      });
      toast.success(t("provSchedule_toastSaved"));
      setDirty(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provSchedule_toastFailSave"));
    } finally {
      setSaving(false);
    }
  }

  const openDays  = slots.filter((s) => s.open).length;
  const closedDays = 7 - openDays;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-52 bg-slate-200 rounded" />
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
            <CalendarDays className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("provSchedule_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {openDays !== 1 ? t("provSchedule_subOpenPlural", { open: openDays, closed: closedDays }) : t("provSchedule_subOpen", { open: openDays, closed: closedDays })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving || hasErrors}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* ── Weekly Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {slots.map((slot) => (
          <div
            key={slot.day}
            className={`px-5 py-4 transition-colors ${slot.open ? "" : "bg-slate-50/60"}`}
          >
          <div className="flex items-center gap-4">
            {/* Day toggle */}
            <div className="w-28 flex-shrink-0">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  role="switch"
                  aria-checked={slot.open}
                  onClick={() => update(slot.day, { open: !slot.open })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    slot.open ? "bg-primary" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                      slot.open ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-sm font-semibold ${slot.open ? "text-slate-800" : "text-slate-400"}`}>
                  {DAY_NAMES[slot.day]}
                </span>
              </label>
            </div>

            {/* Time pickers */}
            {slot.open ? (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 w-8">{t("provSchedule_from")}</span>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => update(slot.day, { startTime: e.target.value })}
                    className={`input text-sm py-1.5 px-2.5 w-[110px] ${hasSlotError(slot) ? "border-red-400 focus:ring-red-300" : ""}`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 w-5">{t("provSchedule_to")}</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => update(slot.day, { endTime: e.target.value })}
                    className={`input text-sm py-1.5 px-2.5 w-[110px] ${hasSlotError(slot) ? "border-red-400 focus:ring-red-300" : ""}`}
                  />
                </div>
                {hasSlotError(slot) ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t("provSchedule_timeError")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400 ml-1">
                    <Clock className="h-3 w-3" />
                    {slotDuration(slot)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">{t("provSchedule_closed")}</span>
            )}
          </div>
          </div>
        ))}
      </div>

      {/* ── Quick Presets ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t("provSchedule_presetsTitle")}</p>
        <div className="flex flex-wrap gap-2">
          {[
            { labelKey: "provSchedule_presetMonFri", fn: () => { setSlots(DEFAULT_SLOTS); setDirty(true); } },
            {
              labelKey: "provSchedule_presetMonSat",
              fn: () => {
                setSlots([0,1,2,3,4,5,6].map((d) => ({ day: d, open: d >= 1 && d <= 6, startTime: "08:00", endTime: "17:00" })));
                setDirty(true);
              },
            },
            {
              labelKey: "provSchedule_preset7Days",
              fn: () => {
                setSlots([0,1,2,3,4,5,6].map((d) => ({ day: d, open: true, startTime: "08:00", endTime: "17:00" })));
                setDirty(true);
              },
            },
            {
              labelKey: "provSchedule_presetCloseAll",
              fn: () => {
                setSlots([0,1,2,3,4,5,6].map((d) => ({ day: d, open: false, startTime: "08:00", endTime: "17:00" })));
                setDirty(true);
              },
            },
          ].map(({ labelKey, fn }) => (
            <button
              key={labelKey}
              onClick={fn}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
            >
              {t(labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex flex-wrap gap-2">
        {slots.filter((s) => s.open).map((s) => (
          <span
            key={s.day}
            className="flex items-center gap-1.5 text-xs font-medium bg-primary/5 text-primary border border-primary/20 px-3 py-1.5 rounded-full"
          >
            <CalendarDays className="h-3 w-3" />
            {DAY_SHORT[s.day]} · {s.startTime}–{s.endTime}
          </span>
        ))}
        {openDays === 0 && (
          <span className="text-sm text-slate-400 italic">{t("provSchedule_noOpenDays")}</span>
        )}
      </div>

      {hasErrors && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{t("provSchedule_fixErrors")}</p>
        </div>
      )}

      {dirty && (
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || hasErrors} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? t("provSchedule_btnSaving") : t("provSchedule_btnSaveChanges")}
          </button>
          <button onClick={() => { load(); setDirty(false); }} className="btn-secondary">
            {t("provSchedule_btnDiscard")}
          </button>
        </div>
      )}

    </div>
  );
}
