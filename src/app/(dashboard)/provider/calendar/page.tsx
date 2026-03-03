import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { CalendarContent } from "./_components/CalendarContent";
import { CalendarSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Calendar" };

export default async function ProviderCalendarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
          <p className="text-slate-500 text-sm mt-1">View and manage your scheduled job assignments.</p>
        </div>
      </div>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent userId={user.userId} />
      </Suspense>
    </div>
  );
}
