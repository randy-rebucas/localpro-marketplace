import { jobRepository, providerProfileRepository } from "@/repositories";

/**
 * Check whether a provider has reached their maximum concurrent job capacity.
 * Active jobs are those with status "assigned" or "in_progress".
 */
export async function checkCapacity(
  providerId: string
): Promise<{ atCapacity: boolean; current: number; max: number }> {
  const [current, profile] = await Promise.all([
    jobRepository.countActiveForProvider(providerId),
    providerProfileRepository.findByUserId(providerId),
  ]);

  const max = (profile as { maxConcurrentJobs?: number } | null)?.maxConcurrentJobs ?? 5;

  return { atCapacity: current >= max, current, max };
}

/**
 * Check whether a provider has existing jobs that overlap with a proposed
 * schedule date. When `estimatedHours` is provided the window spans
 * ±estimatedHours around the scheduleDate; otherwise it checks the entire
 * calendar day.
 */
export async function checkScheduleConflict(
  providerId: string,
  scheduleDate: Date,
  estimatedHours?: number
): Promise<{
  hasConflict: boolean;
  conflictingJobs: Array<{ title: string; scheduleDate: Date }>;
}> {
  let rangeStart: Date;
  let rangeEnd: Date;

  if (estimatedHours && estimatedHours > 0) {
    const ms = estimatedHours * 60 * 60 * 1000;
    rangeStart = new Date(scheduleDate.getTime() - ms);
    rangeEnd = new Date(scheduleDate.getTime() + ms);
  } else {
    // Same calendar day (midnight to midnight)
    rangeStart = new Date(scheduleDate);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(scheduleDate);
    rangeEnd.setHours(23, 59, 59, 999);
  }

  // Use the Job model directly to query for overlapping jobs
  const { connectDB } = await import("@/lib/db");
  const mongoose = await import("mongoose");
  await connectDB();

  const Job = mongoose.default.model("Job");
  const docs = await Job.find({
    providerId: providerId,
    status: { $in: ["assigned", "in_progress"] },
    scheduleDate: { $gte: rangeStart, $lte: rangeEnd },
  })
    .select("title scheduleDate")
    .lean();

  const conflictingJobs = (
    docs as unknown as Array<{ title: string; scheduleDate: Date }>
  ).map((d) => ({
    title: d.title,
    scheduleDate: d.scheduleDate,
  }));

  return {
    hasConflict: conflictingJobs.length > 0,
    conflictingJobs,
  };
}
