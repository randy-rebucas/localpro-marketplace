import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Job from "@/models/Job";
import Message from "@/models/Message";

/**
 * GET /api/user/export
 *
 * Returns a downloadable JSON bundle of all personal data associated with the
 * authenticated user (GDPR / Data Privacy Act of 2012 compliance).
 *
 * Rate-limited to 1 request per 24 hours per user to prevent abuse.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const currentUser = await requireUser();

  // 1 export per 24 hours per user
  const rl = await checkRateLimit(`user-export:${currentUser.userId}`, {
    windowMs: 24 * 60 * 60_000,
    max:      1,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Data export can only be requested once per 24 hours." },
      { status: 429 }
    );
  }

  await connectDB();

  const [user, jobs, messages] = await Promise.all([
    User.findById(currentUser.userId)
      .select("-password -verificationToken -verificationTokenExpiry -resetPasswordToken -resetPasswordTokenExpiry -otpCode -otpExpiry -pushSubscriptions")
      .lean(),
    Job.find({ clientId: currentUser.userId }).select("-__v").lean(),
    Message.find({ senderId: currentUser.userId }).select("threadId body createdAt").lean(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exportData = {
    exportedAt:  new Date().toISOString(),
    requestedBy: currentUser.userId,
    platform:    "LocalPro — https://www.localpro.asia",
    notice:      "This is a copy of the personal data we hold about your account.",
    user,
    jobs:        jobs.slice(0, 500),     // cap at 500 for response size
    messages:    messages.slice(0, 1000),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="localpro-data-export-${currentUser.userId}.json"`,
    },
  });
});
