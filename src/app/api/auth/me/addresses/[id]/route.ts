import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, ValidationError, assertObjectId } from "@/lib/errors";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

const CoordSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const UpdateAddressSchema = z.object({
  label:       z.string().min(1).max(50).trim().optional(),
  address:     z.string().min(3).max(200).trim().optional(),
  isDefault:   z.boolean().optional(),
  coordinates: CoordSchema.optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/auth/me/addresses/[id] — update label/address or set as default */
export const PATCH = withHandler(async (req: NextRequest, ctx: Ctx) => {
  const tokenUser = await requireUser();
  const rl = await checkRateLimit(`auth:addresses:${tokenUser.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await ctx.params;
  assertObjectId(id, "addressId");
  const body = await req.json();
  const parsed = UpdateAddressSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const user = await User.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  const addr = user.addresses?.find((a) => a._id.toString() === id);
  if (!addr) throw new NotFoundError("Address");

  if (parsed.data.label)   addr.label   = parsed.data.label;
  if (parsed.data.address) addr.address = parsed.data.address;
  if (parsed.data.coordinates !== undefined)
    (addr as unknown as { coordinates: unknown }).coordinates = parsed.data.coordinates;

  // Setting this address as default clears all others first
  if (parsed.data.isDefault === true) {
    for (const a of user.addresses ?? []) {
      (a as unknown as { isDefault: boolean }).isDefault = a._id.toString() === id;
    }
  }

  user.markModified("addresses");
  await user.save();
  return NextResponse.json(user.addresses);
});

/** DELETE /api/auth/me/addresses/[id] — remove a saved address */
export const DELETE = withHandler(async (_req: NextRequest, ctx: Ctx) => {
  const tokenUser = await requireUser();
  const rl = await checkRateLimit(`auth:addresses:${tokenUser.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await ctx.params;
  assertObjectId(id, "addressId");

  await connectDB();
  const user = await User.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  const idx = user.addresses?.findIndex((a) => a._id.toString() === id) ?? -1;
  if (idx === -1) throw new NotFoundError("Address");

  const wasDefault = (user.addresses![idx] as unknown as { isDefault: boolean }).isDefault;
  user.addresses!.splice(idx, 1);

  // If the deleted entry was the default and others remain, promote the first
  if (wasDefault && user.addresses!.length > 0) {
    (user.addresses![0] as unknown as { isDefault: boolean }).isDefault = true;
  }

  user.markModified("addresses");
  await user.save();
  return NextResponse.json(user.addresses);
});
