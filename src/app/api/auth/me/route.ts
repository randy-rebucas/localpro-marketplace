import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET() {
  try {
    const tokenUser = await getCurrentUser();

    if (!tokenUser) {
      return apiError("Not authenticated", 401);
    }

    await connectDB();
    const user = await User.findById(tokenUser.userId);

    if (!user) {
      return apiError("User not found", 404);
    }

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("[ME]", err);
    return apiError("Internal server error", 500);
  }
}
