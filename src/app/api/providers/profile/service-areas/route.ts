import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

const CoordSchema = z.object({ lat: z.number(), lng: z.number() });

const ServiceAreaSchema = z.object({
  label:       z.string().min(1).max(80).trim(),
  address:     z.string().min(2).max(200).trim(),
  coordinates: CoordSchema.optional(),
});

/** POST /api/providers/profile/service-areas — add a service area (max 10) */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const body = await req.json();
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
