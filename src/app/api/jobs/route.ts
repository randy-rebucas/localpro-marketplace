import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ForbiddenError } from "@/lib/errors";

const JOB_STATUSES = [
  "pending_validation", "open", "assigned", "in_progress",
  "completed", "disputed", "rejected", "refunded",
] as const;

const CreateJobSchema = z.object({
  title: z.string().min(5).max(200),
  category: z.string().min(1),
  description: z.string().min(20),
  budget: z.number().positive(),
  location: z.string().min(1),
  scheduleDate: z.string().datetime(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);

  const rawStatus = searchParams.get("status");
  const status = rawStatus && (JOB_STATUSES as readonly string[]).includes(rawStatus)
    ? rawStatus
    : undefined;

  const result = await jobService.listJobs(user, {
    status,
    category: searchParams.get("category") ?? undefined,
    page: parseInt(searchParams.get("page") ?? "1"),
    limit: parseInt(searchParams.get("limit") ?? "20"),
    aiRank: searchParams.get("aiRank") === "true",
  });

  return NextResponse.json(result);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError("Only clients can post jobs");

  const body = await req.json();
  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const job = await jobService.createJob(user, parsed.data);
  return NextResponse.json(job, { status: 201 });
});
