import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { userRepository, providerProfileRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
const RowSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 chars").max(100),
  email:    z.string().email("Invalid email"),
  // L6: password is optional — a secure random password is generated server-side when not supplied.
  password: z.string().min(8, "Password must be at least 8 chars").optional().nullable(),
  role:     z.enum(["client", "provider", "admin", "staff"], {
    errorMap: () => ({ message: "Role must be client, provider, admin, or staff" }),
  }),
  // Personal info
  dateOfBirth: z.string().optional().nullable(),
  gender:      z.enum(["male", "female", "other"]).optional().nullable(),
  phone:       z.string().optional().nullable(),
  // Primary address
  address1:  z.string().max(200).optional().nullable(),
  city:      z.string().max(100).optional().nullable(),
  province:  z.string().max(100).optional().nullable(),
  zip:       z.string().max(20).optional().nullable(),
  // Provider profile (pipe-delimited lists)
  skills:           z.string().optional().nullable(), // "skill1|skill2|..."
  workExperiences:  z.string().optional().nullable(), // "exp1|exp2|..."
  yearsOfExperience: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v !== null && v !== undefined && v !== "" ? Number(v) : null)),
});

export type ImportRow = z.infer<typeof RowSchema>;

export interface ImportResult {
  created: number;
  skipped: number;
  failed: { row: number; email?: string; error: string }[];
}

const MAX_ROWS = 500;

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array of rows" }, { status: 400 });
  }
  if (body.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maximum ${MAX_ROWS} rows per import` }, { status: 400 });
  }

  const result: ImportResult = { created: 0, skipped: 0, failed: [] };

  for (let i = 0; i < body.length; i++) {
    const rowNum = i + 1;

    // Validate schema
    const parsed = RowSchema.safeParse(body[i]);
    if (!parsed.success) {
      result.failed.push({
        row:   rowNum,
        email: typeof body[i]?.email === "string" ? body[i].email : undefined,
        error: parsed.error.errors[0].message,
      });
      continue;
    }

    const {
      name, email, role,
      dateOfBirth, gender, phone,
      address1, city, province, zip,
      skills, workExperiences, yearsOfExperience,
    } = parsed.data;

    // L6: generate a secure random password if the import row does not supply one
    const password = parsed.data.password || randomBytes(16).toString("hex");

    // Skip if email already exists
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      result.skipped++;
      continue;
    }

    // Create user (pre-save hook hashes the password)
    try {
      const approvalStatus = role === "provider" ? "pending_approval" : "approved";

      // Concatenate address parts into a single address string
      const fullAddress = [address1, city, province, zip].filter(Boolean).join(", ");
      const addresses = fullAddress
        ? [{ label: "Home", address: fullAddress, isDefault: true }]
        : [];

      const newUser = await userRepository.create({
        name,
        email,
        password,
        role,
        approvalStatus,
        phone:       phone       ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender:      gender      ?? null,
        addresses,
      });

      // Create provider profile if profile fields provided
      if (role === "provider" && (skills || workExperiences || yearsOfExperience != null)) {
        await providerProfileRepository.create({
          userId:          newUser._id,
          skills:          skills          ? skills.split("|").map((s) => s.trim()).filter(Boolean).map((s) => ({ skill: s, yearsExperience: 0, hourlyRate: "" }))          : [],
          workExperiences: workExperiences ? workExperiences.split("|").map((s) => s.trim()).filter(Boolean) : [],
          yearsExperience: yearsOfExperience ?? 0,
        });
      }

      result.created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      result.failed.push({ row: rowNum, email, error: message });
    }
  }

  return NextResponse.json(result);
});
