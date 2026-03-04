import type { IRecurringSchedule } from "@/types";

export const STATUS_STYLE: Record<
  IRecurringSchedule["status"],
  { bg: string; dot: string; text: string; strip: string; border: string; label: string }
> = {
  active:    { bg: "bg-green-100",  dot: "bg-green-500",  text: "text-green-800",  strip: "bg-green-400",  border: "border-l-green-400",  label: "Active"    },
  paused:    { bg: "bg-amber-100",  dot: "bg-amber-400",  text: "text-amber-700",  strip: "bg-amber-400",  border: "border-l-amber-400",  label: "Paused"    },
  cancelled: { bg: "bg-slate-100",  dot: "bg-slate-400",  text: "text-slate-500",  strip: "bg-slate-300",  border: "border-l-slate-300",  label: "Cancelled" },
};

export const FREQ_STYLE: Record<IRecurringSchedule["frequency"], string> = {
  weekly:  "bg-violet-100 text-violet-700",
  monthly: "bg-sky-100 text-sky-700",
};

export const CAT_ICONS: Record<string, string> = {
  "Cleaning":     "🧹",
  "Maintenance":  "🔧",
  "Landscaping":  "🌿",
  "Pest Control": "🦟",
};

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
