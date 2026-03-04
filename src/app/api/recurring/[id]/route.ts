import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recurringScheduleService } from "@/services/recurringSchedule.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const PatchSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
});

const PutSchema = z.object({
  title:               z.string().min(5).max(200).optional(),
  description:         z.string().min(20).optional(),
  budget:              z.number().min(1).optional(),
  location:            z.string().min(1).optional(),
  specialInstructions: z.string().optional(),
  maxRuns:             z.number().int().min(1).nullable().optional(),
  autoPayEnabled:      z.boolean().optional(),
  providerId:          z.string().nullable().optional(),
});

export const GET = withHandler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const schedule = await recurringScheduleService.getById(user, id);
    return NextResponse.json(schedule);
  }
);

export const PUT = withHandler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    const updated = await recurringScheduleService.update(user, id, parsed.data);
    return NextResponse.json(updated);
  }
);

export const PATCH = withHandler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

    let updated;
    switch (parsed.data.action) {
      case "pause":
        updated = await recurringScheduleService.pause(user, id);
        break;
      case "resume":
        updated = await recurringScheduleService.resume(user, id);
        break;
      case "cancel":
        updated = await recurringScheduleService.cancel(user, id);
        break;
    }

    return NextResponse.json(updated);
  }
);
