import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const UpdateUserSchema = z.object({
  isVerified: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
});

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const target = await adminService.getUser(id);
  return NextResponse.json(target);
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const target = await adminService.updateUser(user.userId, id, parsed.data);
  return NextResponse.json(target);
});
