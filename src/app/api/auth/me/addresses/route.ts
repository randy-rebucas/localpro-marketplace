import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, ValidationError } from "@/lib/errors";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

const CoordSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const AddressSchema = z.object({
  label:       z.string().min(1).max(50).trim(),
  address:     z.string().min(3).max(200).trim(),
  coordinates: CoordSchema.optional(),
});

/** POST /api/auth/me/addresses — add a new saved address */
export const POST = withHandler(async (req: NextRequest) => {
  const tokenUser = await requireUser();
  const body = await req.json();
  const parsed = AddressSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const user = await User.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  if (!user.addresses) user.addresses = [];
  if (user.addresses.length >= 10) throw new ValidationError("Maximum 10 addresses allowed");

  const isFirst = user.addresses.length === 0;
  user.addresses.push({
    label:       parsed.data.label,
    address:     parsed.data.address,
    isDefault:   isFirst,
    coordinates: parsed.data.coordinates ?? null,
  } as never);

  await user.save();
  return NextResponse.json(user.addresses, { status: 201 });
});
