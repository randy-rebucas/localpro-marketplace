import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { userRepository } from "@/repositories";
import { requireUser, revokeAllUserTokens, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ValidationError, NotFoundError } from "@/lib/errors";
import AgencyProfile from "@/models/AgencyProfile";
import { checkRateLimit, SENSITIVE_LIMITS } from "@/lib/rateLimit";
import { gravatarUrlForEmail } from "@/lib/gravatar";

const UpdateMeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format (e.g. +639123456789)").nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
  avatar: z
    .string()
    .url()
    .refine((u) => /^https:\/\/res\.cloudinary\.com\//.test(u), "Avatar must be a Cloudinary URL")
    .optional(),
});

export const PUT = withHandler(async (req: NextRequest) => {
  const tokenUser = await requireUser();
  requireCsrfToken(req, tokenUser);
  const rl = await checkRateLimit(`auth:me:put:${tokenUser.userId}`, SENSITIVE_LIMITS.passwordChange);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = UpdateMeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const user = await userRepository.getDocByIdWithPassword(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  if (parsed.data.name) user.name = parsed.data.name;
  if (parsed.data.avatar !== undefined) user.avatar = parsed.data.avatar;
  if (parsed.data.phone !== undefined) (user as unknown as { phone: string | null }).phone = parsed.data.phone ?? null;

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) throw new ValidationError("Current password is required");
    const valid = await user.comparePassword(parsed.data.currentPassword);
    if (!valid) throw new ValidationError("Current password is incorrect");
    user.password = parsed.data.newPassword;
  }

  await user.save();

  if (parsed.data.newPassword) {
    await revokeAllUserTokens(tokenUser.userId);
  }

  const email = user.email;
  return NextResponse.json({
    _id: user._id,
    name: user.name,
    email,
    role: user.role,
    avatar: user.avatar ?? null,
    gravatarUrl: gravatarUrlForEmail(email, 80),
    phone: (user as unknown as { phone?: string | null }).phone ?? null,
    createdAt: user.createdAt,
  });
});

export const GET = withHandler(async () => {
  const tokenUser = await requireUser();
  const rl = await checkRateLimit(`auth:me:get:${tokenUser.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();
  const user = await userRepository.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  let agencyId: string | null = null;
  if (user.role === "provider") {
    const agency = await AgencyProfile.findOne(
      { "staff.userId": new mongoose.Types.ObjectId(String(user._id)) },
      "_id"
    ).lean();
    agencyId = agency ? String(agency._id) : null;
  }

  const email = user.email;
  return NextResponse.json({
    _id: user._id,
    name: user.name,
    email,
    role: user.role,
    isVerified: user.isVerified,
    isSuspended: user.isSuspended,
    avatar: user.avatar ?? null,
    gravatarUrl: gravatarUrlForEmail(email, 80),
    phone: (user as unknown as { phone?: string | null }).phone ?? null,
    kycStatus: (user as unknown as { kycStatus?: string }).kycStatus ?? "none",
    addresses: user.addresses ?? [],
    accountType: user.accountType ?? "personal",
    agencyId,
    createdAt: user.createdAt,
  });
});
