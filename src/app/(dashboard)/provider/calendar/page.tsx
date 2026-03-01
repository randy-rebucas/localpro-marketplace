import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import type { IJob } from "@/types";
import CalendarView from "./CalendarView";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Calendar" };

export default async function ProviderCalendarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobs = await jobRepository.findCalendarJobsForProvider(user.userId);

  // Serialize dates for the CalendarView Client Component
  const serializedJobs = JSON.parse(JSON.stringify(jobs)) as IJob[];

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="provider-calendar"
        title="How Calendar works"
        steps={[
          { icon: "📅", title: "Scheduled jobs", description: "All jobs with a confirmed schedule date appear here, sorted by date." },
          { icon: "🗓️", title: "Plan your week", description: "Use the calendar to avoid double-booking and ensure you can meet each client's schedule." },
          { icon: "🔒", title: "Escrow status", description: "Jobs with funded escrow are highlighted — these have secured payment waiting for you." },
          { icon: "📍", title: "Job location", description: "Click any job to see the full location details and client contact information." },
        ]}
      />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
        <p className="text-slate-500 text-sm mt-0.5">Your scheduled jobs for the month.</p>
      </div>
      <CalendarView jobs={serializedJobs} />
    </div>
  );
}
