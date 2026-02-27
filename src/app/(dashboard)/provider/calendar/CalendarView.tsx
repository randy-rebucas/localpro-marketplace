"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { IJob } from "@/types";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  assigned: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function CalendarView({ jobs }: { jobs: IJob[] }) {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  function getJobsForDay(d: number): IJob[] {
    const day = new Date(year, month, d);
    return jobs.filter((j) => isSameDay(new Date(j.scheduleDate), day));
  }

  const selectedJobs = selected
    ? jobs.filter((j) => isSameDay(new Date(j.scheduleDate), selected))
    : [];

  const monthName = current.toLocaleString("default", { month: "long", year: "numeric" });

  // Build calendar grid — pad start
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-sm font-semibold text-slate-800">{monthName}</h3>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day name row */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-16 sm:h-20 border-b border-r border-slate-100 last:border-r-0" />;
            }
            const dayJobs = getJobsForDay(day);
            const isToday = isSameDay(new Date(year, month, day), today);
            const isSelected = selected ? isSameDay(new Date(year, month, day), selected) : false;

            return (
              <button
                key={day}
                onClick={() => setSelected(isSelected ? null : new Date(year, month, day))}
                className={`h-16 sm:h-20 border-b border-r border-slate-100 last:border-r-0 p-1 text-left hover:bg-slate-50 transition-colors relative ${isSelected ? "bg-primary/5" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-primary text-white" : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {/* Job dots */}
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayJobs.slice(0, 3).map((j) => (
                    <span
                      key={j._id.toString()}
                      className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[j.status] ?? "bg-slate-400"}`}
                    />
                  ))}
                  {dayJobs.length > 3 && (
                    <span className="text-[9px] text-slate-400">+{dayJobs.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        {Object.entries(STATUS_DOT).map(([status, cls]) => (
          <span key={status} className="flex items-center gap-1.5 capitalize">
            <span className={`h-2.5 w-2.5 rounded-full ${cls}`} />
            {status.replace("_", " ")}
          </span>
        ))}
      </div>

      {/* Selected day panel */}
      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">
            {selected.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </h3>

          {selectedJobs.length === 0 ? (
            <p className="text-sm text-slate-400">No jobs scheduled on this day.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedJobs.map((j) => (
                <div key={j._id.toString()} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{j.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{j.category} · {j.location}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(j.scheduleDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{formatCurrency(j.budget)}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 flex-shrink-0">
                    <JobStatusBadge status={j.status} />
                    <Link
                      href={`/provider/jobs`}
                      className="text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
