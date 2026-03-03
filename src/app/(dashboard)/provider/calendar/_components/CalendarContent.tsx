import { jobRepository } from "@/repositories/job.repository";
import CalendarView from "../CalendarView";
import type { IJob } from "@/types";

export async function CalendarContent({ userId }: { userId: string }) {
  const jobs = await jobRepository.findCalendarJobsForProvider(userId);
  const serializedJobs = JSON.parse(JSON.stringify(jobs)) as IJob[];
  return <CalendarView jobs={serializedJobs} />;
}
