import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { providerProfileService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const WorkSlotSchema = z.object({
  enabled: z.boolean(),
  from: z.string().regex(TIME_RE, "Invalid time format, expected HH:MM"),
  to:   z.string().regex(TIME_RE, "Invalid time format, expected HH:MM"),
});

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const UpdateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  yearsExperience: z.number().int().min(0).max(50).optional(),
  hourlyRate: z.number().positive().optional(),
  availabilityStatus: z.enum(["available", "busy", "unavailable"]).optional(),
  schedule: z.object({
    mon: WorkSlotSchema,
    tue: WorkSlotSchema,
    wed: WorkSlotSchema,
    thu: WorkSlotSchema,
    fri: WorkSlotSchema,
    sat: WorkSlotSchema,
    sun: WorkSlotSchema,
  }).optional(),
  portfolioItems: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        imageUrl: z.string().url().optional(),
      })
    )
    .max(10)
    .optional(),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "provider");
  const profile = await providerProfileService.getProfile(user.userId);
  return NextResponse.json(profile);
});

export const PUT = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const body = await req.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const profile = await providerProfileService.upsertProfile(user, parsed.data);
  return NextResponse.json(profile);
});
