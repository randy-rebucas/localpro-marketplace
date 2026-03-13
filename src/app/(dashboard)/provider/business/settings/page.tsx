import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import SettingsClient from "./_components/SettingsClient";

export const metadata: Metadata = { title: "Agency Settings" };

export default async function SettingsPage() {
  await requireBusinessProvider();
  return <SettingsClient />;
}
