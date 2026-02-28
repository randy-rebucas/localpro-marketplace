import type { Metadata } from "next";
import dynamic from "next/dynamic";

const NotificationsPage = dynamic(
  () => import("@/components/notifications/NotificationsPage"),
  {
    loading: () => (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 h-20 animate-pulse" />
        ))}
      </div>
    ),
  }
);

export const metadata: Metadata = { title: "Notifications" };

export default function ClientNotificationsPage() {
  return <NotificationsPage />;
}
