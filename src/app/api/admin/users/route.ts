import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ConflictError } from "@/lib/errors";
import { userRepository } from "@/repositories/user.repository";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const role = searchParams.get("role") ?? undefined;

  const filter = role ? { role } : {};
  const result = await adminService.listUsers(filter, page, limit);
  return NextResponse.json(result);
});

const CreateUserSchema = z.object({
  name:       z.string().min(2, "Name must be at least 2 characters").max(100),
  email:      z.string().email("Invalid email address"),
  password:   z.string().min(8, "Password must be at least 8 characters").max(100),
  role:       z.enum(["client", "provider", "admin", "staff"]),
  isVerified: z.boolean().optional().default(false),
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const parsed = CreateUserSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { name, email, password, role, isVerified } = parsed.data;

  const existing = await userRepository.findByEmail(email);
  if (existing) throw new ConflictError("An account with this email already exists");

  const approvalStatus = role === "provider" ? "pending_approval" : "approved";

  const created = await userRepository.create({
    name,
    email,
    password,
    role,
    isVerified,
    approvalStatus,
  });

  return NextResponse.json(created, { status: 201 });
});
