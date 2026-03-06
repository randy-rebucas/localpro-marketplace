"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { EARNING_SAMPLES } from "../constants";

export function EstimatedEarningsWidget({ className }: { className?: string } = {}) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * EARNING_SAMPLES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(Math.floor(Math.random() * EARNING_SAMPLES.length));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const s = EARNING_SAMPLES[index];
  const monthly = s.avgJob * s.jobsPerWeek * 4;

  return (
    <div
      className={
        className ??
        "w-56 xl:w-64 self-end flex-shrink-0 rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-900/40 to-[#0d2340]/80 p-3"
      }
    >
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
        <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest leading-none">
          How Much Can You Earn?
        </span>
      </div>
      <div className="space-y-0.5 text-xs text-slate-300 mb-2">
        <p>
          <span className="text-slate-500">Service:</span>{" "}
          <span className="font-semibold text-white capitalize">
            {s.icon} {s.service}
          </span>
        </p>
        <p>
          <span className="text-slate-500">Avg job:</span>{" "}
          <span className="font-semibold text-emerald-300">₱{s.avgJob.toLocaleString()}</span>
        </p>
        <p>
          <span className="text-slate-500">Jobs / week:</span>{" "}
          <span className="font-semibold text-white">{s.jobsPerWeek}</span>
        </p>
      </div>
      <div className="border-t border-white/10 pt-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Monthly estimate</p>
        <p className="text-xl font-extrabold text-emerald-300 tabular-nums leading-tight">
          ₱{monthly.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
