import type { Metadata } from "next";
import AppSettingsClient from "./AppSettingsClient";

export const metadata: Metadata = { title: "Application Settings" };

export default function AdminSettingsPage() {
  return <AppSettingsClient />;
}
