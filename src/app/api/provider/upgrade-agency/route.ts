/**
 * POST /api/provider/upgrade-agency
 *
 * Activates a free Agency account for the authenticated provider.
 * Sets accountType from "personal" → "business" (reuses same enum).
 * No payment required — it's free.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AgencyProfile from "@/models/AgencyProfile";
import mongoose from "mongoose";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export const POST = withHandler(async () => {
  const tokenUser = await requireUser();

  if (tokenUser.role !== "provider") {
    throw new ForbiddenError("Only provider accounts can upgrade to Agency.");
  }

  await connectDB();

  // Block agency staff members from creating their own agency
  const isStaff = await AgencyProfile.exists({
    "staff.userId": new mongoose.Types.ObjectId(tokenUser.userId),
  });
  if (isStaff) {
    throw new ForbiddenError(
      "Agency staff members cannot create their own agency. Leave your current agency first."
    );
  }

  const user = await User.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  if (user.accountType === "business") {
    return NextResponse.json({ message: "Already an Agency account." }, { status: 200 });
  }

  user.accountType = "business";
  await user.save();

  return NextResponse.json({ message: "Agency account activated.", accountType: "business" });
});
