"use client";

import { useState } from "react";
import toast from "react-hot-toast";
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

const AVAILABILITY_OPTIONS: {
  value: AvailabilityStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  ring: string;
}[] = [
  {
    value: "available",
    label: "Available",
    description: "Actively accepting new jobs",
    icon: <CircleDot className="h-4 w-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    ring: "ring-2 ring-emerald-400",
  },
  {
    value: "busy",
    label: "Busy",
    description: "Working — limited availability",
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    ring: "ring-2 ring-amber-400",
  },
  {
    value: "unavailable",
    label: "Unavailable",
    description: "Not accepting new jobs",
    icon: <WifiOff className="h-4 w-4" />,
    color: "text-slate-500 bg-slate-50 border-slate-200",
    ring: "ring-2 ring-slate-400",
  },
];

export default function SettingsClient({ initialPreferences, role, initialAvailability = "available" }: Props) {
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
        toast.error(err.error ?? "Failed to save");
        setPrefs(prev);
      }
    } catch {
      toast.error("Could not save preference");
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
        toast.error(err.error ?? "Failed to update availability");
        setAvailability(prev);
      } else {
        toast.success("Availability updated");
      }
    } catch {
      toast.error("Could not update availability");
      setAvailability(prev);
    } finally {
      setSavingAvailability(false);
    }
  }

  async function changePassword() {
    if (!currentPassword) { toast.error("Enter your current password"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSavingPassword(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to change password"); return; }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    ...(role === "provider"
      ? [{ key: "work" as Tab, label: "Work", icon: <Briefcase className="h-4 w-4" /> }]
      : []),
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "privacy",       label: "Privacy",       icon: <Eye  className="h-4 w-4" /> },
    { key: "security",      label: "Security",      icon: <Lock className="h-4 w-4" /> },
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
            <SectionHeader label="Availability Status" />
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
                Your availability is shown on your public profile and affects how clients find you.
              </p>
            </div>
          </div>

          {/* Job preferences */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label="Job Preferences" />
            <div className="divide-y divide-slate-100 px-5">
              <SettingRow
                icon={<Zap className="h-4 w-4" />}
                label="Instant booking"
                description="Let clients book you directly without waiting for your manual quote acceptance"
                checked={prefs.instantBooking}
                onChange={(v) => updatePref("instantBooking", v)}
                saving={saving}
              />
              <SettingRow
                icon={<FileText className="h-4 w-4" />}
                label="Auto read receipt"
                description="Automatically notify clients when you open and read their job post"
                checked={prefs.autoReadReceipt}
                onChange={(v) => updatePref("autoReadReceipt", v)}
                saving={saving}
              />
            </div>
          </div>

          {/* Provider notifications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label="Provider Alerts" />
            <div className="divide-y divide-slate-100 px-5">
              <SettingRow
                icon={<Briefcase className="h-4 w-4" />}
                label="New job alerts"
                description="Get notified when jobs matching your skills and service areas are posted"
                checked={prefs.newJobAlerts}
                onChange={(v) => updatePref("newJobAlerts", v)}
                saving={saving}
              />
              <SettingRow
                icon={<UserCheck className="h-4 w-4" />}
                label="Job invite alerts"
                description="Notify me when a client directly invites me to quote on their job"
                checked={prefs.jobInviteAlerts}
                onChange={(v) => updatePref("jobInviteAlerts", v)}
                saving={saving}
              />
              <SettingRow
                icon={<Clock className="h-4 w-4" />}
                label="Quote expiry reminders"
                description="Remind me before my submitted quotes are about to expire"
                checked={prefs.quoteExpiryReminders}
                onChange={(v) => updatePref("quoteExpiryReminders", v)}
                saving={saving}
              />
              <SettingRow
                icon={<Star className="h-4 w-4" />}
                label="Review alerts"
                description="Notify me when a client leaves a review on a completed job"
                checked={prefs.reviewAlerts}
                onChange={(v) => updatePref("reviewAlerts", v)}
                saving={saving}
              />
            </div>
          </div>

          {/* Quick profile link */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <SectionHeader label="Profile & Visibility" />
            <div className="divide-y divide-slate-100 px-5">
              <SettingRow
                icon={<Eye className="h-4 w-4" />}
                label="Visible in search"
                description="Allow clients to find and view your provider profile in marketplace results"
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
                Edit full profile →
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
            label="Email notifications"
            description="Receive email updates for job status, quotes, and account activity"
            checked={prefs.emailNotifications}
            onChange={(v) => updatePref("emailNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<Bell className="h-4 w-4" />}
            label="Push notifications"
            description="Real-time browser alerts for new activity"
            checked={prefs.pushNotifications}
            onChange={(v) => updatePref("pushNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<Smartphone className="h-4 w-4" />}
            label="SMS notifications"
            description="Text message alerts for urgent updates (carrier rates may apply)"
            checked={prefs.smsNotifications}
            onChange={(v) => updatePref("smsNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Message notifications"
            description="Get notified when someone sends you a new message"
            checked={prefs.messageNotifications}
            onChange={(v) => updatePref("messageNotifications", v)}
            saving={saving}
          />
          <SettingRow
            icon={<Megaphone className="h-4 w-4" />}
            label="Marketing emails"
            description="Promotions, tips, and platform updates from LocalPro"
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
                    <p className="text-sm font-medium text-slate-800">Privacy overview</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your name and contact details are only shared with providers you hire.
                      Job posts show only your first name and general location.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {role === "provider" && (
              <SettingRow
                icon={<Eye className="h-4 w-4" />}
                label="Profile visible in search"
                description="Allow clients to find and view your provider profile"
                checked={prefs.profileVisible}
                onChange={(v) => updatePref("profileVisible", v)}
                saving={saving}
              />
            )}
          </div>

          {/* Data & Account */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data &amp; Account</p>
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
                  <p className="text-sm font-medium text-slate-800">Privacy Policy</p>
                  <p className="text-xs text-slate-500">How we handle your data</p>
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
                  <p className="text-sm font-medium text-slate-800">Terms of Service</p>
                  <p className="text-xs text-slate-500">Platform rules and agreements</p>
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
              <Lock className="h-4 w-4" /> Change Password
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label block mb-1 text-xs">Current Password</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="label block mb-1 text-xs">New Password</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label block mb-1 text-xs">Confirm New Password</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder="Repeat new password"
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
                  Update Password
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <ShieldCheck className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Keep your account secure</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Use a strong, unique password. Never share your credentials.
                If you suspect unauthorized access, change your password immediately and contact support.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
