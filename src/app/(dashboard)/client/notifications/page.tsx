import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const NotificationsPage = dynamic(
  () => import("@/components/notifications/NotificationsPage"),
  {
    loading: () => (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-slate-200" />
            <div className="h-4 w-64 rounded bg-slate-100" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-2.5 w-20 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

export const metadata: Metadata = { title: "Notifications" };

export default async function ClientNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NotificationsPage />;
}
