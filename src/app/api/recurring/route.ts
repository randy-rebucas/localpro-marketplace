import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recurringScheduleService } from "@/services/recurringSchedule.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const CreateSchema = z.object({
  title:               z.string().min(5).max(200),
  category:            z.string().min(1),
  description:         z.string().min(20).max(2000),
  budget:              z.number().min(1),
  location:            z.string().min(1),
  frequency:           z.enum(["weekly", "monthly"]),
  scheduleDate:        z.string().min(1),
  autoPayEnabled:      z.boolean().optional(),
  specialInstructions: z.string().optional(),
  maxRuns:             z.number().int().min(1).optional(),
  providerId:          z.string().optional(),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  const schedules = await recurringScheduleService.list(user);
  return NextResponse.json({ data: schedules });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const schedule = await recurringScheduleService.create(user, parsed.data);
  return NextResponse.json(schedule, { status: 201 });
});
