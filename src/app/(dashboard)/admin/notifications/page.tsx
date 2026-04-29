import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NotificationsPage from "@/components/notifications/NotificationsPage";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");
  return <NotificationsPage />;
}
