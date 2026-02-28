import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import type { IJob } from "@/types";
import CalendarView from "./CalendarView";

export const metadata: Metadata = { title: "Calendar" };

export default async function ProviderCalendarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobs = await jobRepository.findCalendarJobsForProvider(user.userId);

  // Serialize dates for the CalendarView Client Component
  const serializedJobs = JSON.parse(JSON.stringify(jobs)) as IJob[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
        <p className="text-slate-500 text-sm mt-0.5">Your scheduled jobs for the month.</p>
      </div>
      <CalendarView jobs={serializedJobs} />
    </div>
  );
}
