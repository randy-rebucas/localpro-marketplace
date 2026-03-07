"use client";

import { useState, useEffect } from "react";
import { Settings, X, GripVertical, Eye, EyeOff } from "lucide-react";

export interface DashboardPrefs {
  kpis: boolean;
  activity: boolean;
  tier: boolean;
  schedule: boolean;
  actions: boolean;
}

const DEFAULT_PREFS: DashboardPrefs = {
  kpis: true,
  activity: true,
  tier: true,
  schedule: true,
  actions: true,
};

const STORAGE_KEY = "provider_dashboard_prefs";

const WIDGET_META: { key: keyof DashboardPrefs; label: string; description: string }[] = [
  { key: "kpis",     label: "KPI Cards",       description: "Earnings, ratings, active jobs & quotes" },
  { key: "activity", label: "Recent Activity",  description: "Latest job events and status changes"    },
  { key: "tier",     label: "Tier & Loyalty",   description: "Your LocalPro tier progress and points"  },
  { key: "schedule", label: "Today's Schedule", description: "Jobs assigned or in-progress today"      },
  { key: "actions",  label: "Quick Actions",    description: "Shortcut links to key pages"             },
];

interface Props {
  header:   React.ReactNode;
  kpis:     React.ReactNode;
  activity: React.ReactNode;
  tier:     React.ReactNode;
  schedule: React.ReactNode;
  actions:  React.ReactNode;
}

export default function DashboardCustomizer({ header, kpis, activity, tier, schedule, actions }: Props) {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_PREFS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  function toggle(key: keyof DashboardPrefs) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // Avoid hydration mismatch — render everything visible on first paint
  const show = mounted ? prefs : DEFAULT_PREFS;

  const slots = { kpis, activity, tier, schedule, actions };

  return (
    <div className="space-y-6">
      {/* ── Always-visible header ── */}
      {header}

      {/* ── Widgets ── */}
      {show.kpis && slots.kpis}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {show.activity && slots.activity}

          {/* Empty main-column state */}
          {!show.activity && (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 flex flex-col items-center gap-2 text-center">
              <EyeOff className="h-6 w-6 text-slate-300" />
              <p className="text-xs text-slate-400">All main widgets are hidden. <button onClick={() => setPanelOpen(true)} className="text-primary underline">Customize</button> to restore them.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {show.tier     && slots.tier}
          {show.schedule && slots.schedule}
          {show.actions  && slots.actions}

          {/* Empty sidebar state */}
          {!show.tier && !show.schedule && !show.actions && (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 flex flex-col items-center gap-2 text-center">
              <EyeOff className="h-5 w-5 text-slate-300" />
              <p className="text-xs text-slate-400">No sidebar widgets shown.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating customize button ── */}
      <button
        onClick={() => setPanelOpen(true)}
        className="fixed bottom-20 right-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xl transition-all active:scale-95"
      >
        <Settings className="h-4 w-4" />
        Customize
      </button>

      {/* ── Settings panel (side drawer) ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)}
          />

          {/* panel */}
          <div className="relative z-10 w-80 h-full bg-white shadow-2xl flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-900 text-sm">Customize Dashboard</span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* widget list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              <p className="text-xs text-slate-400 mb-3">Toggle sections on or off. Changes save instantly.</p>
              {WIDGET_META.map(({ key, label, description }) => {
                const visible = prefs[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                      visible
                        ? "bg-white border-slate-200 hover:border-primary/40 hover:bg-primary/5"
                        : "bg-slate-50 border-slate-100 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-none mb-0.5">{label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{description}</p>
                    </div>
                    <div className={`flex-shrink-0 transition-colors ${visible ? "text-primary" : "text-slate-300"}`}>
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => {
                  const reset = { ...DEFAULT_PREFS };
                  setPrefs(reset);
                  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); } catch { /* ignore */ }
                }}
                className="w-full text-xs text-slate-500 hover:text-red-500 transition-colors font-medium"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
