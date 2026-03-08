import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ConflictError } from "@/lib/errors";
import { userRepository } from "@/repositories/user.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";

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
  name:            z.string().min(2, "Name must be at least 2 characters").max(100),
  email:           z.string().email("Invalid email address").optional(),
  password:        z.string().min(8, "Password must be at least 8 characters").max(100),
  role:            z.enum(["client", "provider", "admin", "staff", "peso"]),
  isVerified:      z.boolean().optional().default(false),
  // Provider-only optional fields
  phone:           z.string().max(30).optional(),
  skills:          z.array(z.string().min(1).max(60)).max(20).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  // PESO-only: office details (required when role = peso)
  pesoOffice: z.object({
    officeName:   z.string().min(2).max(200),
    municipality: z.string().min(2).max(100),
    region:       z.string().min(2).max(100),
    contactEmail: z.string().email(),
  }).optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const parsed = CreateUserSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { name, email, password, role, isVerified, phone, skills, yearsExperience, pesoOffice } = parsed.data;

  if (role === "peso" && !pesoOffice) {
    throw new ValidationError("PESO office details are required when creating a PESO officer");
  }

  if (email) {
    const existing = await userRepository.findByEmail(email);
    if (existing) throw new ConflictError("An account with this email already exists");
  }

  const approvalStatus = role === "provider" ? "pending_approval" : "approved";

  const created = await userRepository.create({
    name,
    email,
    password,
    role,
    isVerified,
    approvalStatus,
    ...(phone ? { phone } : {}),
  });

  const userId = created._id!.toString();

  // Seed a ProviderProfile with any supplied details
  if (role === "provider") {
    await providerProfileRepository.upsert(userId, {
      ...(skills?.length ? { skills } : {}),
      ...(yearsExperience !== undefined ? { yearsExperience } : {}),
    });
  }

  // Create PESO office with this user as the head officer
  if (role === "peso" && pesoOffice) {
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    await PesoOffice.create({
      ...pesoOffice,
      headOfficerId: userId,
      officerIds: [],
      isActive: true,
    });
  }

  return NextResponse.json(created, { status: 201 });
});
