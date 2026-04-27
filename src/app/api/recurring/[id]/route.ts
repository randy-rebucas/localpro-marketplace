import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { recurringScheduleService } from "@/services/recurringSchedule.service";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const PatchSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
});

const PutSchema = z.object({
  title:               z.string().min(5).max(200).optional(),
  description:         z.string().min(20).max(2000).optional(),
  budget:              z.number().min(1).max(1_000_000).optional(),
  location:            z.string().min(1).max(200).optional(),
  specialInstructions: z.string().max(1000).optional(),
  maxRuns:             z.number().int().min(1).max(52).nullable().optional(),
  autoPayEnabled:      z.boolean().optional(),
  providerId:          z.string().refine((v) => isValidObjectId(v), "Invalid providerId").nullable().optional(),
});

export const GET = withHandler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    assertObjectId(id, "scheduleId");
    const schedule = await recurringScheduleService.getById(user, id);
    return NextResponse.json(schedule);
  }
);

export const PUT = withHandler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    requireRole(user, "client");
    const { id } = await ctx.params;
    assertObjectId(id, "scheduleId");

    const rl = await checkRateLimit(`recurring-put:${user.userId}`, { windowMs: 60_000, max: 30 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    const updated = await recurringScheduleService.update(user, id, parsed.data);
    return NextResponse.json(updated);
  }
);

export const PATCH = withHandler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    requireRole(user, "client");
    const { id } = await ctx.params;
    assertObjectId(id, "scheduleId");

    const rl = await checkRateLimit(`recurring-patch:${user.userId}`, { windowMs: 60_000, max: 30 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json().catch(() => ({}));
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
