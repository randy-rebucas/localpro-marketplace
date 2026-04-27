import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole, STAFF_CAPABILITIES } from "@/lib/auth";
import { userRepository } from "@/repositories";
import { ValidationError, NotFoundError } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const UpdateStaffSchema = z.object({
  capabilities: z
    .array(z.enum(STAFF_CAPABILITIES as [string, ...string[]]))
    .optional(),
  isSuspended: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withHandler(async (req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = UpdateStaffSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const existing = await userRepository.findById(id);
  if (!existing || (existing as { role?: string }).role !== "staff") {
    throw new NotFoundError("Staff member");
  }

  const updated = await userRepository.updateStaff(id, parsed.data);

  return NextResponse.json({
    staff: {
      _id: String(updated!._id),
      name: updated!.name,
      email: updated!.email,
      capabilities: (updated as unknown as { capabilities?: string[] })?.capabilities ?? [],
      isSuspended: updated!.isSuspended,
      createdAt:
        updated!.createdAt instanceof Date
          ? updated!.createdAt.toISOString()
          : updated!.createdAt,
    },
  });
});

export const DELETE = withHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;

  const existing = await userRepository.findById(id);
  if (!existing || (existing as { role?: string }).role !== "staff") {
    throw new NotFoundError("Staff member");
  }

  await userRepository.updateStaff(id, { isSuspended: true });

  return NextResponse.json({ success: true });
});
