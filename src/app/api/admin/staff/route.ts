import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole, STAFF_CAPABILITIES } from "@/lib/auth";
import { userRepository } from "@/repositories";
import { ValidationError, ConflictError } from "@/lib/errors";

const CreateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  capabilities: z
    .array(z.enum(STAFF_CAPABILITIES as [string, ...string[]]))
    .min(1, "At least one capability is required"),
});

export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const staff = await userRepository.findAllStaff();
  const serialized = staff.map((s) => ({
    _id: String(s._id),
    name: s.name,
    email: s.email,
    capabilities: (s as { capabilities?: string[] }).capabilities ?? [],
    isSuspended: s.isSuspended,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
  }));

  return NextResponse.json({ staff: serialized });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const body = await req.json();
  const parsed = CreateStaffSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const existing = await userRepository.findByEmail(parsed.data.email);
  if (existing) throw new ConflictError("An account with this email already exists");

  const created = await userRepository.createStaffUser(parsed.data);

  return NextResponse.json(
    {
      staff: {
        _id: String(created._id),
        name: created.name,
        email: created.email,
        capabilities: (created as { capabilities?: string[] }).capabilities ?? [],
        isSuspended: created.isSuspended,
        createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
      },
    },
    { status: 201 }
  );
});
