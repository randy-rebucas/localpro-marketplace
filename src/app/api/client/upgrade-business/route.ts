/**
 * POST /api/client/upgrade-business
 *
 * Activates a free Business account for the authenticated client.
 * Simply flips accountType from "personal" → "business".
 * No payment required — it's free.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export const POST = withHandler(async () => {
  const tokenUser = await requireUser();

  if (tokenUser.role !== "client") {
    throw new ForbiddenError("Only client accounts can upgrade to Business.");
  }

  await connectDB();

  const user = await User.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  if (user.accountType === "business") {
    return NextResponse.json({ message: "Already a Business account." }, { status: 200 });
  }

  user.accountType = "business";
  await user.save();

  return NextResponse.json({ message: "Business account activated.", accountType: "business" });
});
