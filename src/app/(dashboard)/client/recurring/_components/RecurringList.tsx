"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, Repeat2, CalendarClock, MapPin, CreditCard, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import type { IRecurringSchedule } from "@/types";
import { STATUS_STYLE, FREQ_STYLE, CAT_ICONS, fmtDate } from "./constants";

// ─── Saved Card Strip ────────────────────────────────────────────────────────

function SavedCardStrip() {
  const [method, setMethod] = useState<{ last4: string; brand: string } | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/recurring/saved-method")
      .then((r) => r.json())
      .then((d) => setMethod(d.savedMethod ?? null))
      .catch(() => setMethod(null));
  }, []);

  if (method === undefined) return null;

  return (
    <Link
      href="/client/recurring/saved-card"
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition hover:border-primary/40 hover:shadow-sm group ${
        method ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
      }`}
    >
      <CreditCard className={`h-5 w-5 flex-shrink-0 ${method ? "text-emerald-500" : "text-slate-400"}`} />
      <div className="flex-1 min-w-0">
        {method ? (
          <>
            <p className="text-sm font-semibold text-emerald-800">Auto-pay card saved</p>
            <p className="text-xs text-emerald-700 mt-0.5 capitalize">
              {method.brand} ending in <strong>•••• {method.last4}</strong>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">No saved card</p>
            <p className="text-xs text-slate-500 mt-0.5">Pay by card on your next job to enable auto-pay.</p>
          </>
        )}
      </div>
      <span className="text-xs text-slate-400 group-hover:text-primary transition whitespace-nowrap flex items-center gap-0.5">
        Manage <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex justify-between gap-3">
            <div className="flex gap-2.5">
              <div className="h-6 w-6 rounded bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-200 rounded w-40" />
                <div className="h-3 bg-slate-200 rounded w-60" />
              </div>
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded" />
            <div className="h-5 w-32 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function RecurringList() {
  const [schedules, setSchedules] = useState<IRecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recurring");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSchedules(data.data ?? []);
    } catch {
      toast.error("Could not load recurring schedules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const active = schedules.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-3">
      <SavedCardStrip />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">
          {loading ? "Loading…" : schedules.length === 0
            ? "No recurring bookings yet"
            : `${active} active schedule${active === 1 ? "" : "s"}`}
        </span>
        <button
          onClick={fetchSchedules}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          title="Refresh"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {loading && <ListSkeleton />}

      {!loading && schedules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">🔁</div>
          <div>
            <p className="font-medium text-slate-700">No recurring bookings</p>
            <p className="text-sm text-slate-500 mt-1">
              Set up weekly or monthly jobs for cleaning, maintenance, landscaping, or pest control.
            </p>
          </div>
          <Link href="/client/recurring/new" className="btn-primary mt-1">
            + Create First Schedule
          </Link>
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div className="space-y-3">
          {schedules.map((s) => {
            const st = STATUS_STYLE[s.status];
            const freqCls = FREQ_STYLE[s.frequency];
            const catIcon = CAT_ICONS[s.category] ?? "🔖";

            return (
              <div
                key={s._id!.toString()}
                className={`relative bg-white rounded-xl border border-slate-200 border-l-4 ${st.border} shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-4 sm:p-5 group ${
                  s.status === "cancelled" ? "opacity-60" : ""
                }`}
              >
                {/* Overlay link */}
                <Link
                  href={`/client/recurring/${s._id!.toString()}`}
                  className="absolute inset-0 rounded-xl"
                  aria-label={s.title}
                />

                <div className="flex items-start justify-between gap-3">
                  {/* Left */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg leading-none flex-shrink-0">{catIcon}</span>
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                        {s.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 pl-7">{s.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-400 pl-6">
                      <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded ${freqCls}`}>
                        <Repeat2 className="h-3 w-3" />
                        {s.frequency === "weekly" ? "Weekly" : "Monthly"}
                      </span>
                      <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                        {s.category}
                      </span>
                      {s.location && (
                        <span className="hidden sm:flex items-center gap-1 min-w-0">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{s.location}</span>
                        </span>
                      )}
                      {s.status !== "cancelled" && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <CalendarClock className="h-3 w-3 flex-shrink-0" />
                          Next: {fmtDate(s.nextRunAt)}
                        </span>
                      )}
                    </div>
                    {(s.status !== "cancelled") && (
                      <div className="flex flex-wrap items-center gap-2 pl-6">
                        <span className="text-xs text-slate-400">
                          {s.totalRuns} run{s.totalRuns === 1 ? "" : "s"}{s.maxRuns ? ` of ${s.maxRuns}` : ""}
                        </span>
                        {s.autoPayEnabled && (
                          <span className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                            ⚡ Auto-pay on
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[72px]">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">/ session</p>
                      <p className="text-sm sm:text-lg font-bold text-slate-900 whitespace-nowrap">₱{s.budget.toLocaleString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors mt-auto" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


