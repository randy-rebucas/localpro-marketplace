import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import SettingsClient from "@/components/shared/SettingsClient";
import type { IUserPreferences } from "@/types";

export const metadata: Metadata = { title: "Settings | LocalPro" };

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

export default async function ProviderSettingsPage() {
  const token = await getCurrentUser();
  if (!token) redirect("/login");

  const [user, profile] = await Promise.all([
    userRepository.findById(token.userId),
    providerProfileRepository.findByUserId(token.userId),
  ]);
  if (!user) redirect("/login");

  const prefs: IUserPreferences = {
    ...DEFAULT_PREFS,
    ...((user as unknown as { preferences?: Partial<IUserPreferences> }).preferences ?? {}),
  };

  const availability = (profile?.availabilityStatus ?? "available") as "available" | "busy" | "unavailable";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your availability, preferences, and account security.</p>
      </div>
      <SettingsClient initialPreferences={prefs} role="provider" initialAvailability={availability} />
    </div>
  );
}

