"use client";

import { APP_URL } from "../constants";

export function TrainingCTA() {
  return (
    <div className="flex-shrink-0 rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-900/30 to-[#0d2340]/80 p-3 text-center">
      <div className="text-xl mb-1">🎓</div>
      <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">Upskill &amp; Earn More</p>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
        Complete training to unlock higher-paying jobs and boost your LocalPro reputation.
      </p>
      <div className="mt-2 inline-flex items-center bg-purple-500/20 border border-purple-400/30 rounded-lg px-2 py-1">
        <span className="text-[11px] text-purple-300 font-medium font-mono">{APP_URL}/training</span>
      </div>
    </div>
  );
}
