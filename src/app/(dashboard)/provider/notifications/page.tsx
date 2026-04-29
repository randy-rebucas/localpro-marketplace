import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationsPage from "@/components/notifications/NotificationsPage";

export const metadata: Metadata = { title: "Notifications" };

export default async function ProviderNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NotificationsPage />;
}
