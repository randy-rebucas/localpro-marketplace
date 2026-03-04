"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pause, PlayCircle, XCircle, Pencil,
  CalendarClock, MapPin, Repeat2, ChevronLeft, RefreshCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { IRecurringSchedule } from "@/types";
import { STATUS_STYLE, FREQ_STYLE, CAT_ICONS, fmtDate, fmtDateTime } from "./constants";

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-2 w-full bg-slate-200 rounded-full" />
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex gap-3">
          <div className="h-8 w-8 bg-slate-200 rounded" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-slate-200 rounded w-48" />
            <div className="h-4 bg-slate-200 rounded w-full" />
          </div>
          <div className="h-7 w-20 bg-slate-200 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

export function RecurringDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<IRecurringSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/recurring/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSchedule(data);
    } catch {
      toast.error("Could not load schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: "pause" | "resume" | "cancel") => {
    if (action === "cancel" && !confirm("Cancel this recurring schedule? This cannot be undone.")) return;
    try {
      setActing(action);
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Action failed"); }
      toast.success(action === "pause" ? "Schedule paused." : action === "resume" ? "Schedule resumed." : "Schedule cancelled.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!schedule) return <p className="text-sm text-slate-500">Schedule not found.</p>;

  const st = STATUS_STYLE[schedule.status];
  const catIcon = CAT_ICONS[schedule.category] ?? "🔖";
  const freqCls = FREQ_STYLE[schedule.frequency];

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="overflow-hidden">
        <div className={`h-1.5 w-full ${st.strip}`} />
        <CardBody className="space-y-5">
          {/* Title row */}
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none flex-shrink-0 mt-0.5">{catIcon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{schedule.title}</h2>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${st.bg} ${st.text}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                  {st.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{schedule.description}</p>
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Frequency", value: (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${freqCls}`}>
                  <Repeat2 className="h-3 w-3" />
                  {schedule.frequency === "weekly" ? "Weekly" : "Monthly"}
                </span>
              )},
              { label: "Category", value: (
                <span className="inline-block text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {schedule.category}
                </span>
              )},
              { label: "Budget / session", value: (
                <span className="text-sm font-bold text-emerald-600">₱{schedule.budget.toLocaleString()}</span>
              )},
              { label: "Location", value: (
                <span className="flex items-center gap-1 text-xs text-slate-700">
                  <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                  {schedule.location}
                </span>
              )},
              { label: "Next run", value: (
                <span className="flex items-center gap-1 text-xs text-slate-700">
                  <CalendarClock className="h-3 w-3 flex-shrink-0 text-slate-400" />
                  {schedule.status !== "cancelled" ? fmtDate(schedule.nextRunAt) : "—"}
                </span>
              )},
              { label: "Runs completed", value: (
                <span className="text-sm font-semibold text-slate-700">
                  {schedule.totalRuns}{schedule.maxRuns ? ` / ${schedule.maxRuns}` : ""}
                </span>
              )},
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-1">{label}</p>
                {value}
              </div>
            ))}
          </div>

          {/* Extra fields */}
          {(schedule.specialInstructions || schedule.autoPayEnabled || schedule.lastRunAt) && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              {schedule.autoPayEnabled && (
                <p className="text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                  ⚡ <strong>Auto-pay is on</strong> — you&apos;ll be notified (or auto-charged) each time a job is auto-posted.
                </p>
              )}
              {schedule.specialInstructions && (
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-1">Special Instructions</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{schedule.specialInstructions}</p>
                </div>
              )}
              {schedule.lastRunAt && (
                <p className="text-xs text-slate-400">Last run: {fmtDateTime(schedule.lastRunAt)}</p>
              )}
            </div>
          )}

          {/* Created date */}
          <p className="text-xs text-slate-400">Created {fmtDateTime(schedule.createdAt)}</p>
        </CardBody>
      </Card>

      {/* Actions */}
      {schedule.status !== "cancelled" && (
        <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => doAction("cancel")}
            isLoading={acting === "cancel"}
            className="inline-flex items-center justify-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 sm:ml-auto"
          >
            <XCircle className="h-3.5 w-3.5" /> Cancel Schedule
          </Button>
          {schedule.status === "active" ? (
            <Button
              variant="secondary"
              onClick={() => doAction("pause")}
              isLoading={acting === "pause"}
              className="inline-flex items-center justify-center gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => doAction("resume")}
              isLoading={acting === "resume"}
              className="inline-flex items-center justify-center gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          <Link href={`/client/recurring/${id}/edit`} className="sm:order-first">
            <Button variant="secondary" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
        </div>
      )}

      {schedule.status === "cancelled" && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/client/recurring")}>
            ← Back to list
          </Button>
        </div>
      )}
    </div>
  );
}
