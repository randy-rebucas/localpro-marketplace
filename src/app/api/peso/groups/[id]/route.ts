import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, ForbiddenError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import LivelihoodGroup from "@/models/LivelihoodGroup";

const UpdateGroupSchema = z.object({
  name:          z.string().min(2).max(200).optional(),
  type:          z.string().min(2).max(100).optional(),
  barangay:      z.string().min(1).max(100).optional(),
  description:   z.string().max(500).optional(),
  contactPerson: z.string().max(100).optional(),
  contactPhone:  z.string().max(50).optional(),
  memberCount:   z.number().int().min(0).max(9999).optional(),
  status:        z.enum(["active", "inactive"]).optional(),
});

export const PATCH = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-group-patch:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "groupId");

  const parsed = UpdateGroupSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const group = await LivelihoodGroup.findById(id);
  if (!group) throw new NotFoundError("Group");
  if (group.createdBy.toString() !== user.userId) throw new ForbiddenError();

  const updated = await LivelihoodGroup.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
  return NextResponse.json(updated);
});

export const DELETE = withHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { id } = await params;
  assertObjectId(id, "groupId");

  await connectDB();

  const group = await LivelihoodGroup.findById(id);
  if (!group) throw new NotFoundError("Group");
  if (group.createdBy.toString() !== user.userId) throw new ForbiddenError();

  await LivelihoodGroup.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
});
