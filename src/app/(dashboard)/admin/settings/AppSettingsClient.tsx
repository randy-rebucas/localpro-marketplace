"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gift,
  LayoutDashboard,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings2,
  Shield,
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
  "limits.escrowAutoReleaseDays": 7,
  "limits.jobExpiryDays": 30,
  "limits.disputeEscalationDays": 5,
  "limits.consultationExpiryDays": 7,
  "limits.dailyConsultationLimitClient": 10,
  "limits.dailyConsultationLimitProvider": 5,
  // Loyalty
  "loyalty.pointsPerPeso": 0.1,
  "loyalty.pesoPerHundredPoints": 10,
  "loyalty.minRedemptionPoints": 500,
  "loyalty.firstJobBonusPoints": 100,
  "loyalty.tierThresholdSilver": 500,
  "loyalty.tierThresholdGold": 2000,
  "loyalty.tierThresholdPlatinum": 5000,
  // Fraud & Security
  "fraud.jobFlagScore": 50,
  "fraud.jobBlockScore": 80,
  "fraud.highBudgetThreshold": 5000,
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

type TabId = "general" | "board" | "payments" | "limits" | "loyalty" | "fraud";

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
  "limits.escrowAutoReleaseDays": {
    label: "Escrow Auto-Release (days)",
    description:
      "Days after a job is marked complete before escrow is automatically released to the provider if the client does not act.",
    type: "number",
    min: 1,
    max: 30,
    step: 1,
  },
  "limits.jobExpiryDays": {
    label: "Job Expiry (days)",
    description:
      "Days an open job listing waits for an accepted quote before it is automatically expired.",
    type: "number",
    min: 7,
    max: 90,
    step: 1,
  },
  "limits.disputeEscalationDays": {
    label: "Dispute Escalation (days)",
    description:
      "Days a dispute can remain open/investigating before admins receive an escalation notification.",
    type: "number",
    min: 1,
    max: 14,
    step: 1,
  },
  "limits.consultationExpiryDays": {
    label: "Consultation Expiry (days)",
    description:
      "Days before an unanswered consultation request automatically expires.",
    type: "number",
    min: 1,
    max: 30,
    step: 1,
  },
  "limits.dailyConsultationLimitClient": {
    label: "Daily Consultation Limit (Client)",
    description:
      "Maximum number of consultation requests a client can send per day.",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
  },
  "limits.dailyConsultationLimitProvider": {
    label: "Daily Consultation Limit (Provider)",
    description:
      "Maximum number of consultation requests a provider can send per day.",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
  },
  // ── Loyalty ──────────────────────────────────────────────────────────────────
  "loyalty.pointsPerPeso": {
    label: "Points Earned per ₱1 Spent",
    description:
      "How many loyalty points a client earns per ₱1 of job spend. Default 0.1 = 1 point per ₱10.",
    type: "number",
    min: 0.01,
    max: 1,
    step: 0.01,
  },
  "loyalty.pesoPerHundredPoints": {
    label: "₱ Value per 100 Points Redeemed",
    description:
      "Peso cashback value awarded when a client redeems 100 loyalty points.",
    type: "number",
    unit: "₱",
    min: 1,
    max: 100,
    step: 1,
  },
  "loyalty.minRedemptionPoints": {
    label: "Minimum Points per Redemption",
    description:
      "Minimum loyalty points a client must have to initiate a redemption request.",
    type: "number",
    min: 100,
    max: 5000,
    step: 100,
  },
  "loyalty.firstJobBonusPoints": {
    label: "First Job Bonus Points",
    description:
      "Bonus loyalty points awarded to a client when they complete their very first job.",
    type: "number",
    min: 0,
    max: 1000,
    step: 10,
  },
  "loyalty.tierThresholdSilver": {
    label: "Silver Tier Threshold",
    description:
      "Lifetime points required to reach Silver tier.",
    type: "number",
    min: 100,
    max: 10000,
    step: 100,
  },
  "loyalty.tierThresholdGold": {
    label: "Gold Tier Threshold",
    description:
      "Lifetime points required to reach Gold tier.",
    type: "number",
    min: 500,
    max: 50000,
    step: 100,
  },
  "loyalty.tierThresholdPlatinum": {
    label: "Platinum Tier Threshold",
    description:
      "Lifetime points required to reach Platinum tier.",
    type: "number",
    min: 1000,
    max: 100000,
    step: 500,
  },
  // ── Fraud & Security ─────────────────────────────────────────────────────────
  "fraud.jobFlagScore": {
    label: "Job Flag Score Threshold",
    description:
      "Risk score (0–100) at or above which a new job posting is flagged for admin review.",
    type: "number",
    min: 10,
    max: 100,
    step: 5,
  },
  "fraud.jobBlockScore": {
    label: "Job Block Score Threshold",
    description:
      "Risk score (0–100) at or above which a new job posting is automatically rejected and the client is notified.",
    type: "number",
    min: 10,
    max: 100,
    step: 5,
  },
  "fraud.highBudgetThreshold": {
    label: "High-Budget Fraud Threshold",
    description:
      "Job budgets (₱) above this value incur an elevated fraud risk score. Helps catch inflated-budget scam posts.",
    type: "number",
    unit: "₱",
    min: 1000,
    max: 100000,
    step: 500,
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
      "limits.escrowAutoReleaseDays",
      "limits.jobExpiryDays",
      "limits.disputeEscalationDays",
      "limits.consultationExpiryDays",
      "limits.dailyConsultationLimitClient",
      "limits.dailyConsultationLimitProvider",
    ],
  },
  {
    id: "loyalty",
    label: "Loyalty",
    icon: <Gift className="h-4 w-4" />,
    keys: [
      "loyalty.pointsPerPeso",
      "loyalty.pesoPerHundredPoints",
      "loyalty.minRedemptionPoints",
      "loyalty.firstJobBonusPoints",
      "loyalty.tierThresholdSilver",
      "loyalty.tierThresholdGold",
      "loyalty.tierThresholdPlatinum",
    ],
  },
  {
    id: "fraud",
    label: "Fraud & Security",
    icon: <Shield className="h-4 w-4" />,
    keys: [
      "fraud.jobFlagScore",
      "fraud.jobBlockScore",
      "fraud.highBudgetThreshold",
    ],
  },
];

// ─── CSS toggle switch ────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  id,
  danger,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
  danger?: boolean;
}) {
  const activeColor = danger
    ? "bg-amber-500 focus-visible:ring-amber-400"
    : "bg-blue-600 focus-visible:ring-blue-500";
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        checked ? activeColor : "bg-slate-200 dark:bg-slate-600 focus-visible:ring-slate-400"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-72 rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
    </div>
  );
}

// ─── Dangerous keys that warrant amber highlight ──────────────────────────────
const DANGER_KEYS = new Set(["platform.maintenanceMode"]);

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppSettingsClient() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  // Track the last-persisted snapshot to detect unsaved changes
  const [savedSettings, setSavedSettings] = useState<AppSettings>(DEFAULTS);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: AppSettings = await res.json();
      const merged = { ...DEFAULTS, ...data };
      setSettings(merged);
      setSavedSettings(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
      const merged = { ...DEFAULTS, ...updated };
      setSettings(merged);
      setSavedSettings(merged);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && !loading) handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, saving, loading]);

  function toggleBoolean(key: string) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setNumber(key: string, raw: string) {
    const n = parseFloat(raw);
    setSettings((prev) => ({ ...prev, [key]: isNaN(n) ? prev[key] : n }));
  }

  function resetTab(tab: Tab) {
    const patch: AppSettings = {};
    for (const key of tab.keys) patch[key] = DEFAULTS[key];
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  // Dirty detection helpers
  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );

  function isTabDirty(tab: Tab) {
    return tab.keys.some((k) => settings[k] !== savedSettings[k]);
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const maintenanceOn = !!settings["platform.maintenanceMode"];

  return (
    <div className="flex h-full min-h-screen bg-slate-50 dark:bg-slate-900">

      {/* ── Left sidebar: tab navigation ───────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
            App Settings
          </span>
        </div>

        {/* Tab list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {TABS.map((tab) => {
            const tabDirty = isTabDirty(tab);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span className={isActive ? "text-blue-500 dark:text-blue-400" : ""}>{tab.icon}</span>
                {tab.label}
                {tabDirty && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer: save controls */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-4 space-y-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </div>
          )}
          {isDirty && !saved && (
            <p className="text-xs text-amber-600 dark:text-amber-400 px-1">Unsaved changes</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading || !isDirty}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            <kbd className="font-mono">Ctrl S</kbd> to save
          </p>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">
              {currentTab.label}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage platform-wide configuration and feature flags.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile save */}
            <button
              onClick={handleSave}
              disabled={saving || loading || !isDirty}
              className="md:hidden inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={fetchSettings}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-label="Refresh settings"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Mobile tab strip */}
        <div className="md:hidden flex gap-1 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {TABS.map((tab) => {
            const tabDirty = isTabDirty(tab);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-shrink-0 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tabDirty && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable settings area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Maintenance mode banner */}
          {maintenanceOn && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Maintenance Mode is ON
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  The platform is offline for all non-admin users. Remember to turn this off when done.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Settings card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
            {/* Card header */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">{currentTab.icon}</span>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {currentTab.label}
                </h2>
              </div>
              {!loading && isTabDirty(currentTab) && (
                <button
                  onClick={() => resetTab(currentTab)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset tab
                </button>
              )}
            </div>

            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              currentTab.keys.map((key) => {
                const meta = SETTING_META[key];
                if (!meta) return null;
                const isDanger = DANGER_KEYS.has(key);
                const isChanged = settings[key] !== savedSettings[key];
                const rowBg = isDanger && !!settings[key]
                  ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  : isChanged
                  ? "bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/30";

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors ${rowBg}`}
                  >
                    <label htmlFor={`setting-${key}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className={`text-sm font-medium ${isDanger && !!settings[key] ? "text-amber-700 dark:text-amber-300" : "text-slate-800 dark:text-white"}`}>
                        {meta.label}
                        {isChanged && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400">
                            changed
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {meta.description}
                      </p>
                    </label>

                    {meta.type === "boolean" && (
                      <Toggle
                        id={`setting-${key}`}
                        checked={!!settings[key]}
                        onChange={() => toggleBoolean(key)}
                        danger={isDanger}
                      />
                    )}

                    {meta.type === "number" && (
                      <div className="flex-shrink-0">
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                          {meta.unit && meta.unit !== "%" && (
                            <span className="px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600/50 select-none">
                              {meta.unit}
                            </span>
                          )}
                          <input
                            id={`setting-${key}`}
                            type="number"
                            value={String(settings[key] ?? DEFAULTS[key] ?? "")}
                            min={meta.min}
                            max={meta.max}
                            step={meta.step ?? 1}
                            onChange={(e) => setNumber(key, e.target.value)}
                            className="w-20 bg-transparent text-slate-800 dark:text-white text-sm px-3 py-1.5 text-right focus:outline-none"
                          />
                          {meta.unit === "%" && (
                            <span className="px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600/50 select-none">
                              %
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
