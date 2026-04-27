import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppSettingsClient from "./AppSettingsClient";

export const metadata: Metadata = { title: "Application Settings" };

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  return <AppSettingsClient />;
}
