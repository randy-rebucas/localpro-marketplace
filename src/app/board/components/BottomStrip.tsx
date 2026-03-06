"use client";

import { APP_URL, PRICE_HIGHLIGHTS, PLATFORM_PARTNERS } from "../constants";
import type { BoardData } from "../types";

interface BottomStripProps {
  stats: { openJobs: number; completedJobs: number; topProviders: number };
  features: BoardData["features"];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
      {children}
    </p>
  );
}

export function BottomStrip({ stats, features }: BottomStripProps) {
  const anyVisible =
    features.marketplaceStats ||
    features.priceGuide ||
    features.businessCta ||
    features.partners ||
    features.jobAlerts;

  if (!anyVisible) return null;

  return (
    <div className="flex-shrink-0 bg-[#0d1e2e] border-t border-white/10 flex divide-x divide-white/10 overflow-hidden">

      {/* Marketplace Stats */}
      {features.marketplaceStats && (
        <div className="flex-1 flex flex-col justify-center items-center gap-1.5 px-4 py-2.5 min-w-0">
          <SectionLabel>Live Stats</SectionLabel>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-extrabold text-emerald-300 tabular-nums leading-none">
                {stats.openJobs.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-500/70 font-semibold uppercase tracking-wider mt-0.5">Open Jobs</p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-xl font-extrabold text-blue-300 tabular-nums leading-none">
                {stats.completedJobs.toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-500/70 font-semibold uppercase tracking-wider mt-0.5">Completed</p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-xl font-extrabold text-amber-300 tabular-nums leading-none">
                {stats.topProviders.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-500/70 font-semibold uppercase tracking-wider mt-0.5">Providers</p>
            </div>
          </div>
        </div>
      )}

      {/* Service Price Guide */}
      {features.priceGuide && (
        <div className="flex-1 flex flex-col justify-center px-4 py-2.5 gap-1 min-w-0">
          <SectionLabel>Service Price Guide</SectionLabel>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {PRICE_HIGHLIGHTS.map((p) => (
              <div key={p.service} className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] text-slate-400 truncate leading-none">
                  {p.icon} {p.service}
                </span>
                <span className="text-[11px] font-bold text-emerald-300 flex-shrink-0 tabular-nums">
                  ₱{p.avgJob.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Client CTA */}
      {features.businessCta && (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-2.5 gap-1 text-center min-w-0">
          <SectionLabel>For Businesses</SectionLabel>
          <p className="text-base font-extrabold text-white leading-tight">Post a Job on LocalPro</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Find skilled providers fast — repairs, tech & more.
          </p>
          <div className="mt-0.5 inline-flex items-center bg-blue-500/15 border border-blue-400/25 rounded-md px-2 py-0.5">
            <span className="text-[11px] text-blue-300 font-mono tracking-tight">{APP_URL}/post-job</span>
          </div>
        </div>
      )}

      {/* Partners */}
      {features.partners && (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-2.5 gap-1.5 min-w-0">
          <SectionLabel>Payment Providers</SectionLabel>
          <div className="flex flex-wrap justify-center gap-1">
            {PLATFORM_PARTNERS.map((p) => (
              <span
                key={p}
                className="text-[11px] text-slate-300 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Job Alerts */}
      {features.jobAlerts && (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-2.5 gap-1 text-center min-w-0">
          <SectionLabel>Job Alerts</SectionLabel>
          <p className="text-base font-extrabold text-white leading-none">Get Notified</p>
          <p className="text-[11px] text-slate-400">Scan to enable push alerts</p>
          <div className="bg-white rounded-lg p-1 mt-0.5 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=44x44&data=${encodeURIComponent(
                `${APP_URL}/provider/alerts`
              )}&format=png&color=0d2340&bgcolor=ffffff&margin=2`}
              alt="Job Alerts QR"
              width={44}
              height={44}
              className="rounded block"
            />
          </div>
        </div>
      )}

    </div>
  );
}
