import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import LivelihoodGroup from "@/models/LivelihoodGroup";

const CreateGroupSchema = z.object({
  name:          z.string().min(2).max(200),
  type:          z.string().min(2).max(100),
  barangay:      z.string().min(1).max(100),
  description:   z.string().max(500).optional(),
  contactPerson: z.string().max(100).optional(),
  contactPhone:  z.string().max(50).optional(),
  memberCount:   z.number().int().min(0).max(9999).optional(),
  status:        z.enum(["active", "inactive"]).optional(),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "peso");
  await connectDB();

  const groups = await LivelihoodGroup.find({ createdBy: user.userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ data: groups, total: groups.length });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const parsed = CreateGroupSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const group = await LivelihoodGroup.create({
    ...parsed.data,
    createdBy: user.userId,
  });

  return NextResponse.json(group.toObject(), { status: 201 });
});
