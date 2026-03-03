import { CheckCircle2, Clock } from "lucide-react";

/* ─── Progress Bar ─────────────────────────────────────────────── */

const PROGRESS_STAGES = [
  { key: "assigned",    label: "Assigned",    pct: 20 },
  { key: "funded",      label: "Funded",      pct: 40 },
  { key: "in_progress", label: "In Progress", pct: 65 },
  { key: "completed",   label: "Done",        pct: 100 },
] as const;

function deriveProgress(status: string, escrowStatus: string): number {
  if (status === "completed")  return 100;
  if (status === "in_progress") return 65;
  if (status === "assigned" && escrowStatus === "funded") return 40;
  if (status === "assigned") return 20;
  return 0;
}

export function JobProgressBar({
  status,
  escrowStatus,
}: {
  status: string;
  escrowStatus: string;
}) {
  if (!["assigned", "in_progress", "completed"].includes(status)) return null;

  const pct   = deriveProgress(status, escrowStatus);
  const label = PROGRESS_STAGES.find((s) => s.pct === pct)?.label ?? "In Progress";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Job Progress
        </p>
        <span className="text-sm font-bold text-primary">{pct}%</span>
      </div>

      {/* Stage track */}
      <div className="flex items-center gap-1 mb-3">
        {PROGRESS_STAGES.map((s, idx) => {
          const done    = pct >= s.pct;
          const current = pct === s.pct;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    done
                      ? "bg-primary"
                      : "bg-slate-200"
                  } ${current ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}
                />
                <span
                  className={`text-[9px] font-medium whitespace-nowrap ${
                    current ? "text-primary" : done ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < PROGRESS_STAGES.length - 1 && (
                <div
                  className={`h-px flex-1 mx-1 transition-colors ${
                    pct > s.pct ? "bg-primary" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bar */}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{label}</p>
    </div>
  );
}

/* ─── Service Checklist ────────────────────────────────────────── */

export function JobServiceChecklist({
  status,
  escrowStatus,
}: {
  status: string;
  escrowStatus: string;
}) {
  if (!["assigned", "in_progress", "completed", "disputed"].includes(status)) return null;

  const steps = [
    { label: "Provider assigned",  done: true },
    { label: "Escrow funded",       done: escrowStatus !== "not_funded" },
    { label: "Work started",        done: ["in_progress", "completed", "disputed"].includes(status) },
    { label: "Work completed",      done: ["completed", "disputed"].includes(status) },
    { label: "Payment released",    done: escrowStatus === "released" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Service Checklist
        </p>
        <span className="text-xs text-slate-400 font-medium">
          {doneCount}/{steps.length} complete
        </span>
      </div>
      <ul className="space-y-2.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 ${
                s.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
            </span>
            <span
              className={`text-sm ${
                s.done ? "text-slate-800 font-medium" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
            {s.done && (
              <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                ✓ Done
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
