import { jobRepository } from "@/repositories/job.repository";
import Link from "next/link";
import { CalendarDays, MapPin, Clock } from "lucide-react";

export async function TodaySchedule({ userId }: { userId: string }) {
  const todayJobs = await jobRepository.findTodayForProvider(userId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-slate-900 text-sm">Today&apos;s Schedule</h3>
        </div>
        <Link href="/provider/calendar" className="text-xs text-primary hover:underline">
          Full calendar
        </Link>
      </div>

      {todayJobs.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-slate-400 text-sm">No jobs scheduled for today.</p>
          <Link href="/provider/marketplace" className="mt-2 inline-block text-xs text-primary hover:underline">
            Browse available jobs →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {todayJobs.map((job) => {
            const time = new Date(job.scheduleDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const isInProgress = job.status === "in_progress";
            return (
              <li key={String(job._id)}>
                <Link
                  href={`/provider/jobs/${String(job._id)}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                      isInProgress ? "bg-emerald-400" : "bg-blue-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {time}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isInProgress
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isInProgress ? "In Progress" : "Assigned"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
