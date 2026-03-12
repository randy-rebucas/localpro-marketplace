import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ForbiddenError, UnprocessableError } from "@/lib/errors";
import { getAppSetting } from "@/lib/appSettings";
import { businessService } from "@/services/business.service";

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
  scheduleDate: z.string().datetime().refine(
    (val) => new Date(val) > new Date(),
    { message: "Schedule date must be in the future" }
  ),
  specialInstructions: z.string().max(500).optional(),
  beforePhoto: z.array(z.string().url()).max(5).optional(),
  coordinates: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }).optional(),
  invitedProviderId: z.string().optional(),
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
    page:  Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1),
    limit: Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20),
    aiRank: searchParams.get("aiRank") === "true",
  });

  return NextResponse.json(result);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError("Only clients can post jobs");

  // ── Platform gate ────────────────────────────────────────────────────
  const [maintenance, minBudget] = await Promise.all([
    getAppSetting("platform.maintenanceMode", false),
    getAppSetting("payments.minJobBudget", 500),
  ]);
  if (maintenance) throw new UnprocessableError("Platform is under maintenance. Please try again later.");

  const body = await req.json();
  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
  if (parsed.data.budget < (minBudget as number)) {
    throw new ValidationError(`Job budget must be at least ₱${(minBudget as number).toLocaleString()}`);
  }

  // ── Business org monthly job limit ──────────────────────────────────────
  await businessService.checkBusinessJobMonthlyLimit(user.userId);

  const job = await jobService.createJob(user, parsed.data);
  return NextResponse.json(job, { status: 201 });
});
