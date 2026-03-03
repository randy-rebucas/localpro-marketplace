import { FileText, CalendarDays, Camera, ClipboardCheck } from "lucide-react";

const STEPS = [
  { label: "Job Details",       icon: FileText,         color: "blue" },
  { label: "Budget & Schedule", icon: CalendarDays,     color: "violet" },
  { label: "Photos",            icon: Camera,           color: "emerald" },
  { label: "Review & Submit",   icon: ClipboardCheck,   color: "primary" },
] as const;

interface StepIndicatorProps {
  current: number;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-start gap-1">
      {STEPS.map(({ label, icon: Icon }, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
            {/* Circle + connector */}
            <div className="flex items-center w-full">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  done   ? "bg-green-500 text-white shadow-sm shadow-green-200"
                         : active
                         ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/10 scale-110"
                         : "bg-slate-100 text-slate-400",
                ].join(" ")}
              >
                {done
                  ? <span className="text-sm">✓</span>
                  : <Icon className="h-3.5 w-3.5" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-1 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-500"
                    style={{ width: done ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
            {/* Label */}
            <span
              className={[
                "text-[10px] font-medium text-center leading-tight",
                active ? "text-primary"
                       : done ? "text-green-600"
                              : "text-slate-400",
              ].join(" ")}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
