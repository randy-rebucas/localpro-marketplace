import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import type { IJob } from "@/types";
import CalendarView from "./CalendarView";

export const metadata: Metadata = { title: "Calendar" };

export default async function ProviderCalendarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const jobs = await Job.find({
    providerId: user.userId,
    status: { $in: ["assigned", "in_progress", "completed"] },
    scheduleDate: { $exists: true },
  })
    .select("title category scheduleDate status budget location")
    .sort({ scheduleDate: 1 })
    .lean() as unknown as IJob[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
        <p className="text-slate-500 text-sm mt-0.5">Your scheduled jobs for the month.</p>
      </div>
      <CalendarView jobs={JSON.parse(JSON.stringify(jobs)) as IJob[]} />
    </div>
  );
}
