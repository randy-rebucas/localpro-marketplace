"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import {
  Bell,
  Lock,
  Eye,
  Mail,
  MessageSquare,
  Smartphone,
  Megaphone,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  Star,
  Zap,
  FileText,
  UserCheck,
  Clock,
  WifiOff,
  CircleDot,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import Button from "@/components/ui/Button";
import type { IUserPreferences } from "@/types";

type AvailabilityStatus = "available" | "busy" | "unavailable";

interface Props {
  initialPreferences: IUserPreferences;
  role: "client" | "provider";
  initialAvailability?: AvailabilityStatus;
}

const DEFAULT_PREFS: IUserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  messageNotifications: true,
  profileVisible: true,
  newJobAlerts: true,
  quoteExpiryReminders: true,
  jobInviteAlerts: true,
  reviewAlerts: true,
  instantBooking: false,
  autoReadReceipt: false,
};

type Tab = "notifications" | "privacy" | "security" | "work";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-primary" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon,
  label,
  description,
  checked,
  onChange,
  saving,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex-shrink-0 text-slate-400">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={saving} />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

type TFunc = ReturnType<typeof useTranslations>;

function getAvailabilityOptions(t: TFunc): {
  value: AvailabilityStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  ring: string;
}[] {
  return [
    {
      value: "available",
      label: t("availStatusAvailable"),
      description: t("availDescAvailable"),
      icon: <CircleDot className="h-4 w-4" />,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      ring: "ring-2 ring-emerald-400",
    },
    {
      value: "busy",
      label: t("availStatusBusy"),
      description: t("availDescBusy"),
      icon: <Clock className="h-4 w-4" />,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      ring: "ring-2 ring-amber-400",
    },
    {
      value: "unavailable",
      label: t("availStatusUnavailable"),
      description: t("availDescUnavailable"),
      icon: <WifiOff className="h-4 w-4" />,
      color: "text-slate-500 bg-slate-50 border-slate-200",
      ring: "ring-2 ring-slate-400",
    },
  ];
}

export default function SettingsClient({ initialPreferences, role, initialAvailability = "available" }: Props) {
  const t       = useTranslations("settingsClient");
  const tCommon = useTranslations("common");
  const AVAILABILITY_OPTIONS = getAvailabilityOptions(t);

  const [tab, setTab] = useState<Tab>(role === "provider" ? "work" : "notifications");
  const [prefs, setPrefs] = useState<IUserPreferences>({ ...DEFAULT_PREFS, ...initialPreferences });
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityStatus>(initialAvailability);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Security tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function updatePref(key: keyof IUserPreferences, value: boolean) {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaving(true);
    try {
      const res = await apiFetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? t("saveFailed"));
        setPrefs(prev);
      }
    } catch {
      toast.error(t("saveError"));
      setPrefs(prev);
    } finally {
      setSaving(false);
    }
  }

  async function updateAvailability(status: AvailabilityStatus) {
    const prev = availability;
    setAvailability(status);
    setSavingAvailability(true);
    try {
      const res = await apiFetch("/api/providers/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityStatus: status }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? t("availUpdateFailed"));
        setAvailability(prev);
      } else {
        toast.success(t("availUpdateSuccess"));
      }
    } catch {
      toast.error(t("availUpdateError"));
      setAvailability(prev);
    } finally {
      setSavingAvailability(false);
    }
  }

  async function changePassword() {
    if (!currentPassword) { toast.error(t("enterCurrentPassword")); return; }
    if (newPassword.length < 8) { toast.error(t("newPasswordTooShort")); return; }
    if (newPassword !== confirmPassword) { toast.error(t("passwordMismatch")); return; }
    setSavingPassword(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t("changePasswordFailed")); return; }
      toast.success(t("passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setSavingPassword(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    ...(role === "provider"
      ? [{ key: "work" as Tab, label: t("tabWork"), icon: <Briefcase className="h-4 w-4" /> }]
      : []),
    { key: "notifications", label: t("tabNotifications"), icon: <Bell className="h-4 w-4" /> },
    { key: "privacy",       label: t("tabPrivacy"),       icon: <Eye  className="h-4 w-4" /> },
    { key: "security",      label: t("tabSecurity"),      icon: <Lock className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Work (provider only) ── */}
      {tab === "work" && role === "provider" && (
        <div className="space-y-4">
          {/* Availability status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label={t("sectionAvailability")} />
            <div className="p-4 grid grid-cols-3 gap-3">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  disabled={savingAvailability}
                  onClick={() => updateAvailability(opt.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center disabled:opacity-60 ${
                    availability === opt.value
                      ? `${opt.color} ${opt.ring} shadow-sm`
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span className={availability === opt.value ? "" : "text-slate-400"}>
                    {opt.icon}
                  </span>
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">{opt.description}</span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-400">
                {t("availabilityHint")}
              </p>
            </div>
          </div>

          {/* Job preferences */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label={t("sectionJobPrefs")} />
            <div className="divide-y divide-slate-100 px-5">
              <SettingRow
                icon={<Zap className="h-4 w-4" />}
                label={t("instantBookingLabel")}
                description={t("instantBookingDesc")}
                checked={prefs.instantBooking}
                onChange={(v) => updatePref("instantBooking", v)}
                saving={saving}
              />
              <SettingRow
                icon={<FileText className="h-4 w-4" />}
                label={t("autoReadReceiptLabel")}
                description={t("autoReadReceiptDesc")}
                checked={prefs.autoReadReceipt}
                onChange={(v) => updatePref("autoReadReceipt", v)}
                saving={saving}
              />
            </div>
          </div>

          {/* Provider notifications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label={t("sectionProviderAlerts")} />
            <div className="divide-y divide-slate-100 px-5">
              <SettingRow
                icon={<Briefcase className="h-4 w-4" />}
                label={t("newJobAlertsLabel")}
                description={t("newJobAlertsDesc")}
                checked={prefs.newJobAlerts}
                onChange={(v) => updatePref("newJobAlerts", v)}
                saving={saving}
              />
              <SettingRow
                icon={<UserCheck className="h-4 w-4" />}
                label={t("jobInviteAlertsLabel")}
                description={t("jobInviteAlertsDesc")}
                checked={prefs.jobInviteAlerts}
                onChange={(v) => updatePref("jobInviteAlerts", v)}
                saving={saving}
              />
              <SettingRow
                icon={<Clock className="h-4 w-4" />}
                label={t("quoteExpiryLabel")}
                description={t("quoteExpiryDesc")}
                checked={prefs.quoteExpiryReminders}
                onChange={(v) => updatePref("quoteExpiryReminders", v)}
                saving={saving}
              />
              <SettingRow
                icon={<Star className="h-4 w-4" />}
                label={t("reviewAlertsLabel")}
                description={t("reviewAlertsDesc")}
                checked={prefs.reviewAlerts}
                onChange={(v) => updatePref("reviewAlerts", v)}
                saving={saving}
              />
            </div>
          </div>

          {/* Quick profile link */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label={t("sectionProfileVisibility")} />
            <div className="divide-y divide-slate-100 px-5">
              <SettingRow
                icon={<Eye className="h-4 w-4" />}
                label={t("visibleInSearchLabel")}
                description={t("visibleInSearchDesc")}
                checked={prefs.profileVisible}
                onChange={(v) => updatePref("profileVisible", v)}
                saving={saving}
              />
            </div>
            <div className="px-5 pb-4 pt-2">
              <a
                href="/provider/profile"
                className="text-xs text-primary hover:underline font-medium"
              >
                {t("editFullProfile")}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === "notifications" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100 px-5">
          <SettingRow
            icon={<Mail className="h-4 w-4" />}
            label={t("emailNotifLabel")}
            description={t("emailNotifDesc")}
            checked={prefs.emailNotifications}
            onChange={(v) => updatePref("emailNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<Bell className="h-4 w-4" />}
            label={t("pushNotifLabel")}
            description={t("pushNotifDesc")}
            checked={prefs.pushNotifications}
            onChange={(v) => updatePref("pushNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<Smartphone className="h-4 w-4" />}
            label={t("smsNotifLabel")}
            description={t("smsNotifDesc")}
            checked={prefs.smsNotifications}
            onChange={(v) => updatePref("smsNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<MessageSquare className="h-4 w-4" />}
            label={t("messageNotifLabel")}
            description={t("messageNotifDesc")}
            checked={prefs.messageNotifications}
            onChange={(v) => updatePref("messageNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<Megaphone className="h-4 w-4" />}
            label={t("marketingEmailsLabel")}
            description={t("marketingEmailsDesc")}
            checked={prefs.marketingEmails}
            onChange={(v) => updatePref("marketingEmails", v)}
            saving={saving}
          />
        </div>
      )}

      {/* ── Privacy ── */}
      {tab === "privacy" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card divide-y divide-slate-100 px-5">
            {role === "client" && (
              <div className="py-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t("privacyOverviewTitle")}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t("privacyOverviewDesc")}</p>
                  </div>
                </div>
              </div>
            )}
            {role === "provider" && (
              <SettingRow
                icon={<Eye className="h-4 w-4" />}
                label={t("profileVisibleLabel")}
                description={t("profileVisibleDesc")}
                checked={prefs.profileVisible}
                onChange={(v) => updatePref("profileVisible", v)}
                saving={saving}
              />
            )}
          </div>

          {/* Data & Account */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("sectionDataAccount")}</p>
            </div>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{t("privacyPolicy")}</p>
                  <p className="text-xs text-slate-500">{t("privacyPolicyDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 border-t border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{t("termsOfService")}</p>
                  <p className="text-xs text-slate-500">{t("termsOfServiceDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </div>
      )}

      {/* ── Security ── */}
      {tab === "security" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4" /> {t("changePasswordTitle")}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label block mb-1 text-xs">{t("currentPasswordLabel")}</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder={t("currentPasswordPlaceholder")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="label block mb-1 text-xs">{t("newPasswordLabel")}</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder={t("newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label block mb-1 text-xs">{t("confirmPasswordLabel")}</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="pt-1">
                <Button
                  size="sm"
                  isLoading={savingPassword}
                  onClick={changePassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  {t("updatePasswordBtn")}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <ShieldCheck className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">{t("securityTipTitle")}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t("securityTipDesc")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
