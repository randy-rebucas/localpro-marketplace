"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Monitor,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Wallet,
} from "lucide-react";

type AppSettings = Record<string, unknown>;

const DEFAULTS: AppSettings = {
  // Platform
  "platform.maintenanceMode": false,
  "platform.newRegistrations": true,
  "platform.kycRequired": false,
  // Job Board
  "board.lguFilterEnabled": true,
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
  // Payments
  "payments.baseCommissionRate": 15,
  "payments.highCommissionRate": 20,
  "payments.minJobBudget": 500,
  "payments.minPayoutAmount": 100,
  // Limits
  "limits.maxQuotesPerJob": 5,
  "limits.quoteValidityDays": 7,
  "limits.maxActiveJobsPerClient": 10,
};

type SettingType = "boolean" | "number";

interface SettingMeta {
  label: string;
  description: string;
  type: SettingType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

type TabId = "general" | "board" | "payments" | "limits";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  keys: string[];
}

const SETTING_META: Record<string, SettingMeta> = {
  // ── General ─────────────────────────────────────────────────────────────────
  "platform.maintenanceMode": {
    label: "Maintenance Mode",
    description:
      "Take the entire platform offline for maintenance. Authenticated admins can still access the dashboard.",
    type: "boolean",
  },
  "platform.newRegistrations": {
    label: "Allow New Registrations",
    description:
      "Enable sign-up for new clients and providers. Disable during fraud incidents or platform overload.",
    type: "boolean",
  },
  "platform.kycRequired": {
    label: "Require KYC to Post Jobs",
    description:
      "Clients must complete identity verification before posting a job. Reduces fraudulent postings.",
    type: "boolean",
  },
  // ── Job Board ────────────────────────────────────────────────────────────────
  "board.lguFilterEnabled": {
    label: "LGU Filter (Ormoc Only)",
    description:
      "When enabled, the public job board only displays jobs posted within Ormoc City (municipality / LGU level). Disable to show jobs from all locations nationwide.",
    type: "boolean",
  },
  "board.activityFeed": {
    label: "Activity Feed",
    description:
      "Show a live 'Marketplace Activity' feed on the public job board. Polls every 12 seconds.",
    type: "boolean",
  },
  "board.earningsWidget": {
    label: "Estimated Earnings Widget",
    description:
      "Show a 'How Much Can You Earn?' widget. Cycles through service examples every 60 seconds.",
    type: "boolean",
  },
  "board.categoryDemand": {
    label: "Category Demand Widget",
    description:
      "Show a 'Most Requested Today' bar chart. Refreshes every 60 seconds.",
    type: "boolean",
  },
  "board.achievementsWidget": {
    label: "Provider Achievements Widget",
    description:
      "Highlight top providers with badges (Fast Responder, Top Rated, 10 Jobs Done). Flashes every 60 seconds.",
    type: "boolean",
  },
  "board.urgentJobs": {
    label: "Featured Jobs Strip",
    description:
      "Show a 'Featured Jobs' strip highlighting the 2 highest-budget open jobs.",
    type: "boolean",
  },
  "board.trainingCta": {
    label: "Training CTA",
    description:
      "Show an 'Upskill & Earn More' training call-to-action card at the bottom of the right panel.",
    type: "boolean",
  },
  "board.marketplaceStats": {
    label: "Marketplace Stats",
    description:
      "Show the Marketplace Stats section (open jobs, completed, top providers) in the bottom strip.",
    type: "boolean",
  },
  "board.priceGuide": {
    label: "Service Price Guide",
    description:
      "Show average job prices per service in the bottom strip.",
    type: "boolean",
  },
  "board.businessCta": {
    label: "Business Client CTA",
    description:
      "Show the 'Post a Job on LocalPro' call-to-action in the bottom strip.",
    type: "boolean",
  },
  "board.partners": {
    label: "Payment Partners",
    description:
      "Show the payment partners section (GCash, Maya, PayMongo, etc.) in the bottom strip.",
    type: "boolean",
  },
  "board.jobAlerts": {
    label: "Job Alerts QR",
    description:
      "Show the Job Alerts QR code section so providers can subscribe to push notifications.",
    type: "boolean",
  },
  // ── Payments ─────────────────────────────────────────────────────────────────
  "payments.baseCommissionRate": {
    label: "Base Commission Rate",
    description:
      "Platform fee applied to standard service categories (e.g. Cleaning, Plumbing).",
    type: "number",
    unit: "%",
    min: 0,
    max: 50,
    step: 0.5,
  },
  "payments.highCommissionRate": {
    label: "High-Value Commission Rate",
    description:
      "Platform fee for specialized or high-value categories (e.g. HVAC, Roofing, Major Renovations).",
    type: "number",
    unit: "%",
    min: 0,
    max: 50,
    step: 0.5,
  },
  "payments.minJobBudget": {
    label: "Minimum Job Budget",
    description:
      "Clients must set a job budget of at least this amount when posting.",
    type: "number",
    unit: "₱",
    min: 0,
    step: 50,
  },
  "payments.minPayoutAmount": {
    label: "Minimum Payout Amount",
    description:
      "Providers must accumulate at least this balance before requesting a wallet withdrawal.",
    type: "number",
    unit: "₱",
    min: 0,
    step: 50,
  },
  // ── Limits ───────────────────────────────────────────────────────────────────
  "limits.maxQuotesPerJob": {
    label: "Max Quotes per Job",
    description:
      "Maximum number of provider quotes allowed on a single job posting.",
    type: "number",
    min: 1,
    max: 20,
    step: 1,
  },
  "limits.quoteValidityDays": {
    label: "Quote Validity (days)",
    description:
      "Number of days before an unanswered quote automatically expires.",
    type: "number",
    min: 1,
    max: 60,
    step: 1,
  },
  "limits.maxActiveJobsPerClient": {
    label: "Max Active Jobs per Client",
    description:
      "Maximum number of simultaneously open (unfilled) job postings a single client account can have.",
    type: "number",
    min: 1,
    max: 100,
    step: 1,
  },
};

const TABS: Tab[] = [
  {
    id: "general",
    label: "General",
    icon: <Server className="h-4 w-4" />,
    keys: ["platform.maintenanceMode", "platform.newRegistrations", "platform.kycRequired"],
  },
  {
    id: "board",
    label: "Job Board",
    icon: <LayoutDashboard className="h-4 w-4" />,
    keys: [
      "board.lguFilterEnabled",
      "board.activityFeed",
      "board.earningsWidget",
      "board.categoryDemand",
      "board.achievementsWidget",
      "board.urgentJobs",
      "board.trainingCta",
      "board.marketplaceStats",
      "board.priceGuide",
      "board.businessCta",
      "board.partners",
      "board.jobAlerts",
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: <Wallet className="h-4 w-4" />,
    keys: [
      "payments.baseCommissionRate",
      "payments.highCommissionRate",
      "payments.minJobBudget",
      "payments.minPayoutAmount",
    ],
  },
  {
    id: "limits",
    label: "Limits",
    icon: <Settings2 className="h-4 w-4" />,
    keys: [
      "limits.maxQuotesPerJob",
      "limits.quoteValidityDays",
      "limits.maxActiveJobsPerClient",
    ],
  },
];

export default function AppSettingsClient() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [activeTab, setActiveTab] = useState<TabId>("general");
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

  function setNumber(key: string, raw: string) {
    const n = parseFloat(raw);
    setSettings((prev) => ({ ...prev, [key]: isNaN(n) ? prev[key] : n }));
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!;

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
                Manage platform-wide configuration and feature flags.
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
          <div className="px-5 py-4 flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500">{currentTab.icon}</span>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {currentTab.label}
            </h2>
          </div>

          {loading ? (
            <div className="px-5 py-8 flex items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading settings…</span>
            </div>
          ) : (
            currentTab.keys.map((key) => {
              const meta = SETTING_META[key];
              if (!meta) return null;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
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

                  {meta.type === "number" && (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {meta.unit && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">{meta.unit}</span>
                      )}
                      <input
                        type="number"
                        value={String(settings[key] ?? DEFAULTS[key] ?? "")}
                        min={meta.min}
                        max={meta.max}
                        step={meta.step ?? 1}
                        onChange={(e) => setNumber(key, e.target.value)}
                        className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              );
            })
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
