import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { recurringScheduleService } from "@/services/recurringSchedule.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";

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
  // L17: ObjectId format-validated at schema level; existence checked below
  providerId:          z.string().refine((v) => isValidObjectId(v), "Invalid providerId").optional(),
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
