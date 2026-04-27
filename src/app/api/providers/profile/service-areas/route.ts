import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

const CoordSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const ServiceAreaSchema = z.object({
  label:       z.string().min(1).max(80).trim(),
  address:     z.string().min(2).max(200).trim(),
  coordinates: CoordSchema.optional(),
});

/** POST /api/providers/profile/service-areas — add a service area (max 10) */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`service-area:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = ServiceAreaSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const profile = await ProviderProfile.findOneAndUpdate(
    { userId: user.userId },
    { $setOnInsert: { userId: user.userId } },
    { new: true, upsert: true }
  );

  if ((profile.serviceAreas ?? []).length >= 10) {
    throw new ValidationError("Maximum of 10 service areas allowed");
  }

  profile.serviceAreas = profile.serviceAreas ?? [];
  profile.serviceAreas.push({
    label:       parsed.data.label,
    address:     parsed.data.address,
    coordinates: parsed.data.coordinates,
  } as never);

  await profile.save();
  return NextResponse.json(profile.serviceAreas, { status: 201 });
});
