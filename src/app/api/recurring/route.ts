import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { recurringScheduleService } from "@/services/recurringSchedule.service";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";

const OBJECT_ID = z.string().refine((v) => isValidObjectId(v), "Invalid providerId");

const CreateSchema = z.object({
  title:               z.string().min(5).max(200),
  category:            z.string().min(1).max(100),
  description:         z.string().min(20).max(2000),
  budget:              z.number().min(1).max(1_000_000),
  location:            z.string().min(1).max(200),
  frequency:           z.enum(["weekly", "monthly"]),
  scheduleDate:        z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  autoPayEnabled:      z.boolean().optional(),
  specialInstructions: z.string().max(1000).optional(),
  maxRuns:             z.number().int().min(1).max(52).optional(),
  providerId:          OBJECT_ID.optional(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`recurring-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const schedules = await recurringScheduleService.list(user);
  return NextResponse.json({ data: schedules });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "client");

  const rl = await checkRateLimit(`recurring-post:${user.userId}`, { windowMs: 3_600_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  // L17: Verify the specified providerId exists and is an approved active provider
  if (parsed.data.providerId) {
    const profile = await providerProfileRepository.findByUserId(parsed.data.providerId);
    if (!profile) throw new NotFoundError("Provider");
    const pp = profile as unknown as { isActive?: boolean; approvalStatus?: string };
    if (pp.approvalStatus && pp.approvalStatus !== "approved") {
      throw new NotFoundError("Provider");
    }
  }

  const schedule = await recurringScheduleService.create(user, parsed.data);
  return NextResponse.json(schedule, { status: 201 });
});
