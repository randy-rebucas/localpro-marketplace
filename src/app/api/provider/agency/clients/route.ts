import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";

/** GET /api/provider/agency/clients
 *  Returns unique clients who have booked jobs with this agency (owner + all staff).
 */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-clients:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  // Include owner + all agency staff userIds in the lookup
  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();
  const staffUserIds = agency
    ? [user.userId, ...agency.staff.map((s) => String(s.userId))]
    : [user.userId];

  const jobs = await Job.find(
    {
      providerId: { $in: staffUserIds },
      status: { $in: ["assigned", "in_progress", "completed", "disputed"] },
    },
    "clientId status budget title category createdAt updatedAt"
  )
    .populate("clientId", "name email avatar createdAt")
    .sort({ updatedAt: -1 })
    .lean();

  type ClientEntry = {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
    joinedAt: string;
    jobCount: number;
    totalValue: number;
    lastJobDate: string;
    lastJobTitle: string;
    statuses: string[];
    categories: string[];
  };

  const clientMap = new Map<string, ClientEntry>();

  for (const job of jobs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = job.clientId as any as { _id: { toString(): string }; name: string; email: string; avatar?: string; createdAt: string } | null;
    if (!c) continue;
    const id = c._id.toString();
    const existing = clientMap.get(id);
    const jobDate = (job.updatedAt as Date ?? job.createdAt as Date).toISOString();
    if (existing) {
      existing.jobCount += 1;
      existing.totalValue += (job.budget as number) ?? 0;
      if (!existing.statuses.includes(job.status as string)) existing.statuses.push(job.status as string);
      if (job.category && !existing.categories.includes(job.category as string)) existing.categories.push(job.category as string);
      // Keep most recent job as "last job"
      if (jobDate > existing.lastJobDate) {
        existing.lastJobDate  = jobDate;
        existing.lastJobTitle = job.title as string;
      }
    } else {
      clientMap.set(id, {
        _id: id,
        name: c.name,
        email: c.email,
        avatar: c.avatar ?? null,
        joinedAt: c.createdAt,
        jobCount: 1,
        totalValue: (job.budget as number) ?? 0,
        lastJobDate:  jobDate,
        lastJobTitle: job.title as string,
        statuses: [job.status as string],
        categories: job.category ? [job.category as string] : [],
      });
    }
  }

  const clients = Array.from(clientMap.values()).sort(
    (a, b) => new Date(b.lastJobDate).getTime() - new Date(a.lastJobDate).getTime()
  );

  return NextResponse.json({ clients });
});

