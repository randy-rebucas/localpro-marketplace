"use client";

import { useEffect, useState } from "react";
import { Monitor, RefreshCw, Save, ToggleLeft, ToggleRight } from "lucide-react";

interface AppSettings {
  "board.activityFeed"?: boolean;
  [key: string]: unknown;
}

const DEFAULTS: AppSettings = {
  "board.activityFeed": false,
  "board.earningsWidget": false,
  "board.categoryDemand": false,
  "board.achievementsWidget": false,
  "board.urgentJobs": false,
  "board.trainingCta": false,
  "board.marketplaceStats": false,
  "board.priceGuide": false,
  "board.businessCta": false,
  "board.partners": false,
  "board.jobAlerts": false,
};

const SETTING_META: Record<string, { label: string; description: string; type: "boolean" }> = {
  "board.activityFeed": {
    label: "Job Board — Activity Feed",
    description:
      "Show a live 'Marketplace Activity' feed on the public job board. Polls for real-time events every 12 seconds.",
    type: "boolean",
  },
  "board.earningsWidget": {
    label: "Job Board — Estimated Earnings Widget",
    description:
      "Show a flashing 'How Much Can You Earn?' widget on the public job board. Cycles through service examples every 60 seconds to motivate providers.",
    type: "boolean",
  },
  "board.categoryDemand": {
    label: "Job Board — Category Demand Widget",
    description:
      "Show a 'Most Requested Today' bar chart on the public job board. Refreshes every 60 seconds.",
    type: "boolean",
  },
  "board.achievementsWidget": {
    label: "Job Board — Provider Achievements Widget",
    description:
      "Show a 'Provider Achievements' widget on the public job board. Highlights top providers with badges (Fast Responder, Top Rated, 10 Jobs Done). Flashes every 60 seconds.",
    type: "boolean",
  },
  "board.urgentJobs": {
    label: "Job Board — Featured Jobs Strip",
    description:
      "Show a 'Featured Jobs' strip at the top of the left panel highlighting the 2 highest-budget open jobs.",
    type: "boolean",
  },
  "board.trainingCta": {
    label: "Job Board — Training CTA",
    description:
      "Show a 'Upskill & Earn More' training call-to-action card at the bottom of the right panel.",
    type: "boolean",
  },
  "board.marketplaceStats": {
    label: "Job Board — Bottom: Marketplace Stats",
    description:
      "Show the Marketplace Stats section in the bottom strip (open jobs, completed, top providers).",
    type: "boolean",
  },
  "board.priceGuide": {
    label: "Job Board — Bottom: Service Price Guide",
    description:
      "Show the Service Price Guide section in the bottom strip with average job prices per service.",
    type: "boolean",
  },
  "board.businessCta": {
    label: "Job Board — Bottom: Business Client CTA",
    description:
      "Show the 'Post a Job on LocalPro' business client call-to-action in the bottom strip.",
    type: "boolean",
  },
  "board.partners": {
    label: "Job Board — Bottom: Partners",
    description:
      "Show the payment partners section (GCash, Maya, PayMongo, etc.) in the bottom strip.",
    type: "boolean",
  },
  "board.jobAlerts": {
    label: "Job Board — Bottom: Job Alerts QR",
    description:
      "Show the Job Alerts QR code section in the bottom strip so providers can subscribe to notifications.",
    type: "boolean",
  },
};

export default function AppSettingsClient() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: AppSettings = await res.json();
      setSettings({ ...DEFAULTS, ...data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const updated: AppSettings = await res.json();
      setSettings({ ...DEFAULTS, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function toggleBoolean(key: string) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                Application Settings
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Control feature flags and display settings for the platform.
              </p>
            </div>
          </div>
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Refresh settings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Settings card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Feature Flags
            </h2>
          </div>

          {loading ? (
            <div className="px-5 py-8 flex items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading settings…</span>
            </div>
          ) : (
            Object.entries(SETTING_META).map(([key, meta]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {meta.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                {meta.type === "boolean" && (
                  <button
                    onClick={() => toggleBoolean(key)}
                    className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                    aria-label={`Toggle ${meta.label}`}
                    role="switch"
                    aria-checked={!!settings[key]}
                  >
                    {settings[key] ? (
                      <ToggleRight className="h-7 w-7 text-blue-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
