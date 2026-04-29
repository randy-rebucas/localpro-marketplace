import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";

const CreateSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["agency", "company", "other"]).optional().default("agency"),
});

const UpdateSchema = z.object({
  name:                   z.string().min(2).max(200).optional(),
  type:                   z.enum(["agency", "company", "other"]).optional(),
  logo:                   z.string().url("logo must be a valid URL").max(2000).optional(),
  banner:                 z.string().url("banner must be a valid URL").max(2000).optional(),
  description:            z.string().max(2000).optional(),
  businessRegistrationNo: z.string().max(100).optional(),
  operatingHours:         z.string().max(500).optional(),
  website:                z.string().url("website must be a valid URL").max(2000).optional(),
  serviceAreas:           z.array(z.string().max(200)).max(50).optional(),
  serviceCategories:      z.array(z.string().max(200)).max(50).optional(),
});

/** GET /api/provider/agency/profile — fetch caller's agency profile */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError("Only providers can access agency features.");

  const rl = await checkRateLimit(`agency-profile:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();

  return NextResponse.json({ agency: agency ?? null });
});

/** POST /api/provider/agency/profile — create agency profile */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError("Only providers can create an agency profile.");

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const existing = await AgencyProfile.findOne({ providerId: user.userId });
  if (existing) {
    return NextResponse.json({ agency: existing.toObject() });
  }

  const profile = await AgencyProfile.create({
    providerId: user.userId,
    name: parsed.data.name,
    type: parsed.data.type,
  });

  return NextResponse.json({ agency: profile.toObject() }, { status: 201 });
});

/** PATCH /api/provider/agency/profile — update agency profile */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: user.userId },
    { $set: parsed.data },
    { new: true }
  ).lean();

  return NextResponse.json({ agency });
});
