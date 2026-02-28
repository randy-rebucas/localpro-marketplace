import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const UpdateMeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
  avatar: z.string().url().optional(),
});

export const PUT = withHandler(async (req: NextRequest) => {
  const tokenUser = await requireUser();
  const body = await req.json();
  const parsed = UpdateMeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const user = await User.findById(tokenUser.userId).select("+password");
  if (!user) throw new ValidationError("User not found");

  if (parsed.data.name) user.name = parsed.data.name;
  if (parsed.data.avatar !== undefined) user.avatar = parsed.data.avatar;

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) throw new ValidationError("Current password is required");
    const valid = await user.comparePassword(parsed.data.currentPassword);
    if (!valid) throw new ValidationError("Current password is incorrect");
    user.password = parsed.data.newPassword;
  }

  await user.save();

  return NextResponse.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt,
  });
});

export const GET = withHandler(async () => {
  const tokenUser = await requireUser();

  await connectDB();
  const user = await User.findById(tokenUser.userId);
  if (!user) throw new ValidationError("User not found");

  return NextResponse.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    isSuspended: user.isSuspended,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt,
  });
});
