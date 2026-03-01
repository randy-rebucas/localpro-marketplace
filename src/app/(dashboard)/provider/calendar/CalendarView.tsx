"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutGrid,
  MapPin, User, Clock, AlertTriangle, ShieldCheck, Briefcase, X,
} from "lucide-react";
import Link from "next/link";
import { JobStatusBadge, EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarJob {
  _id: string;
  title: string;
  category: string;
  scheduleDate: string;
  status: string;
  escrowStatus: string;
  budget: number;
  location: string;
  clientId?: { _id: string; name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}
function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

const STATUS_COLOR: Record<string, { dot: string; chip: string; border: string }> = {
  assigned:    { dot: "bg-blue-500",  chip: "bg-blue-50 text-blue-700 border-blue-200",   border: "border-l-blue-400" },
  in_progress: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200", border: "border-l-amber-400" },
  completed:   { dot: "bg-green-500", chip: "bg-green-50 text-green-700 border-green-200", border: "border-l-green-400" },
  disputed:    { dot: "bg-red-500",   chip: "bg-red-50 text-red-700 border-red-200",        border: "border-l-red-400" },
};

function isOverdue(job: CalendarJob, today: Date) {
  return (
    new Date(job.scheduleDate) < today &&
    job.status !== "completed" &&
    job.status !== "disputed"
  );
}

// ─── JobChip (tiny label shown inside calendar cell) ─────────────────────────

function JobChip({
  job, today, onClick,
}: {
  job: CalendarJob;
  today: Date;
  onClick: () => void;
}) {
  const overdue = isOverdue(job, today);
  const c = STATUS_COLOR[job.status] ?? { chip: "bg-slate-50 text-slate-700 border-slate-200" };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={job.title}
      className={`w-full text-left truncate text-[10px] font-medium px-1.5 py-0.5 rounded border ${
        overdue ? "bg-red-50 text-red-700 border-red-200" : c.chip
      }`}
    >
      {overdue && "⚠ "}
      {job.title}
    </button>
  );
}

// ─── JobCard (shown in selected-day panel) ────────────────────────────────────

function JobCard({ job, today }: { job: CalendarJob; today: Date }) {
  const overdue = isOverdue(job, today);
  const c = STATUS_COLOR[job.status] ?? { border: "border-l-slate-300" };
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 ${c.border} bg-white p-4 space-y-2.5`}>
      {/* Title + badges row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{job.title}</p>
          <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[10px] font-medium mt-1">
            {job.category}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <JobStatusBadge status={job.status as never} />
          <EscrowBadge    status={job.escrowStatus as never} />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {job.clientId?.name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {job.clientId.name}
          </span>
        )}
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(job.scheduleDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-sm font-bold text-slate-800">{formatCurrency(job.budget)}</span>
        <div className="flex items-center gap-2">
          {overdue && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          )}
          {job.escrowStatus === "funded" && !overdue && (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <ShieldCheck className="h-3 w-3" /> Escrow held
            </span>
          )}
          <Link href="/provider/jobs" className="text-xs text-primary hover:underline font-medium">
            View job →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type View = "month" | "week";

export default function CalendarView({ jobs: rawJobs }: { jobs: unknown[] }) {
  const jobs = rawJobs as CalendarJob[];

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view,       setView]       = useState<View>("month");
  const [current,    setCurrent]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekAnchor, setWeekAnchor] = useState(startOfWeek(today));
  const [selected,   setSelected]   = useState<Date | null>(today);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const thisMonthJobs = useMemo(() => {
    const y = current.getFullYear(), m = current.getMonth();
    return jobs.filter((j) => {
      const d = new Date(j.scheduleDate);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [jobs, current]);

  const todayCount  = useMemo(() => jobs.filter((j) => isSameDay(new Date(j.scheduleDate), today)).length, [jobs, today]);
  const overdueCount = useMemo(() => jobs.filter((j) => isOverdue(j, today)).length, [jobs, today]);

  // ── Month grid ─────────────────────────────────────────────────────────────
  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  // ── Week row ───────────────────────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));

  function getJobsForDate(d: Date) {
    return jobs.filter((j) => isSameDay(new Date(j.scheduleDate), d));
  }

  const selectedJobs = selected ? getJobsForDate(selected) : [];

  // ── Navigation ─────────────────────────────────────────────────────────────
  function prev() {
    if (view === "month") setCurrent(new Date(year, month - 1, 1));
    else setWeekAnchor((w) => addDays(w, -7));
  }
  function next() {
    if (view === "month") setCurrent(new Date(year, month + 1, 1));
    else setWeekAnchor((w) => addDays(w, 7));
  }
  function goToday() {
    setCurrent(new Date(today.getFullYear(), today.getMonth(), 1));
    setWeekAnchor(startOfWeek(today));
    setSelected(today);
  }

  const heading =
    view === "month"
      ? `${MONTH_NAMES[month]} ${year}`
      : (() => {
          const end = addDays(weekAnchor, 6);
          return weekAnchor.getMonth() === end.getMonth()
            ? `${MONTH_NAMES[weekAnchor.getMonth()]} ${weekAnchor.getDate()}–${end.getDate()}, ${year}`
            : `${MONTH_NAMES[weekAnchor.getMonth()]} ${weekAnchor.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${year}`;
        })();

  return (
    <div className="space-y-5">

      {/* ── Summary KPI bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* This month */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
            <Briefcase className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">This Month</p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{thisMonthJobs.length}</p>
          </div>
        </div>

        {/* Today */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card px-4 py-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Today</p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{todayCount}</p>
          </div>
        </div>

        {/* Overdue */}
        <div className={`bg-white rounded-xl border shadow-card px-4 py-3 flex items-center gap-3 ${overdueCount > 0 ? "border-red-200" : "border-slate-200"}`}>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${overdueCount > 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400"}`}>
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Overdue</p>
            <p className={`text-xl font-bold leading-tight ${overdueCount > 0 ? "text-red-600" : "text-slate-800"}`}>
              {overdueCount}
            </p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout: calendar left, detail right ───────────── */}
      <div className="flex gap-4 items-start">

      {/* Left column: calendar + legend */}
      <div className="flex-1 min-w-0 space-y-4">

      {/* ── Calendar card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="ml-1 px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              Today
            </button>
          </div>

          <h3 className="text-sm font-semibold text-slate-800 text-center flex-1 truncate">{heading}</h3>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
            <button
              onClick={() => setView("month")}
              className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                view === "month" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors border-l border-slate-200 ${
                view === "week" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Week
            </button>
          </div>
        </div>

        {/* Day-name header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* ── Month view ──────────────────────────────────────────────────── */}
        {view === "month" && (
          <div className="grid grid-cols-7">
            {monthCells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[88px] border-b border-r border-slate-100 bg-slate-50/50 last:border-r-0"
                  />
                );
              }
              const cellDate = new Date(year, month, day);
              const dayJobs  = getJobsForDate(cellDate);
              const isToday     = isSameDay(cellDate, today);
              const isSelected  = selected && isSameDay(cellDate, selected);
              const isPast      = cellDate < today && !isToday;

              return (
                <div
                  key={day}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(isSelected ? null : cellDate)}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(isSelected ? null : cellDate)}
                  className={`min-h-[88px] border-b border-r border-slate-100 last:border-r-0 p-1.5 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                    isSelected ? "ring-2 ring-primary ring-inset bg-primary/5" : ""
                  } ${isPast ? "bg-slate-50/60" : ""}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                      isToday
                        ? "bg-primary text-white shadow-sm"
                        : isPast
                        ? "text-slate-350"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 2).map((j) => (
                      <JobChip
                        key={j._id}
                        job={j}
                        today={today}
                        onClick={() => setSelected(cellDate)}
                      />
                    ))}
                    {dayJobs.length > 2 && (
                      <p className="text-[10px] text-slate-400 pl-1">+{dayJobs.length - 2} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Week view ────────────────────────────────────────────────────── */}
        {view === "week" && (
          <div className="grid grid-cols-7">
            {weekDays.map((d) => {
              const dayJobs    = getJobsForDate(d);
              const isToday    = isSameDay(d, today);
              const isSelected = selected && isSameDay(d, selected);
              const isPast     = d < today && !isToday;

              return (
                <div
                  key={d.toISOString()}
                  onClick={() => setSelected(isSelected ? null : d)}
                  className={`min-h-[120px] border-r border-slate-100 last:border-r-0 p-2 cursor-pointer hover:bg-slate-50 transition-colors ${
                    isSelected ? "ring-2 ring-primary ring-inset bg-primary/5" : ""
                  } ${isPast ? "bg-slate-50/60" : ""}`}
                >
                  {/* Date header */}
                  <div className="flex flex-col items-center mb-2">
                    <span className="text-[10px] font-medium text-slate-400 uppercase">
                      {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                    </span>
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        isToday
                          ? "bg-primary text-white shadow-sm"
                          : isPast
                          ? "text-slate-350"
                          : "text-slate-700"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  {/* Job chips */}
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 3).map((j) => (
                      <JobChip
                        key={j._id}
                        job={j}
                        today={today}
                        onClick={() => setSelected(d)}
                      />
                    ))}
                    {dayJobs.length > 3 && (
                      <p className="text-[10px] text-slate-400 pl-1">+{dayJobs.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pl-1">
        {Object.entries(STATUS_COLOR).map(([status, c]) => (
          <span key={status} className="flex items-center gap-1.5 capitalize">
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
            {status.replace("_", " ")}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-red-500" />
          Overdue
        </span>
      </div>

      </div>{/* end left column */}

      {/* ── Right column: detail panel (slides in) ──────────────────────── */}
      <div
        className={`transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${
          selected ? "w-[340px] opacity-100" : "w-0 opacity-0"
        }`}
      >
        {/* Fixed-width inner so content never squishes during animation */}
        <div className="w-[340px] sticky top-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="min-w-0 flex-1">
                {selected && (
                  <>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {selected.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""} scheduled
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="ml-2 flex-shrink-0 p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="p-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {selectedJobs.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No jobs on this day.</p>
              ) : (
                selectedJobs.map((j) => (
                  <JobCard key={j._id} job={j} today={today} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      </div>{/* end two-column row */}
    </div>
  );
}
