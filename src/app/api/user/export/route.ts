import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { activityRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Job from "@/models/Job";
import Message from "@/models/Message";
import Review from "@/models/Review";
import WalletTransaction from "@/models/WalletTransaction";
import ProviderProfile from "@/models/ProviderProfile";

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

  const [user, jobs, sentMessages, receivedMessages, reviews, walletTxs, providerProfile] =
    await Promise.all([
      User.findById(currentUser.userId)
        .select("-password -verificationToken -verificationTokenExpiry -resetPasswordToken -resetPasswordTokenExpiry -otpCode -otpExpiry -pushSubscriptions")
        .lean(),
      Job.find({ clientId: currentUser.userId }).select("-__v").lean(),
      Message.find({ senderId: currentUser.userId }).select("threadId body createdAt").lean(),
      Message.find({ receiverId: currentUser.userId }).select("threadId body createdAt").lean(),
      Review.find({ clientId: currentUser.userId }).select("-__v").lean(),
      WalletTransaction.find({ userId: currentUser.userId }).sort({ createdAt: -1 }).limit(1000).lean(),
      ProviderProfile.findOne({ userId: currentUser.userId }).select("-__v").lean(),
    ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Log this export for audit trail (fire-and-forget — must not block the response)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  activityRepository.log({
    userId:    currentUser.userId,
    eventType: "user_data_exported",
    ipAddress: ip,
    metadata:  { exportedAt: new Date().toISOString() },
  }).catch((err: unknown) => console.error("[user/export] ActivityLog failed", err));

  const exportData = {
    exportedAt:     new Date().toISOString(),
    requestedBy:    currentUser.userId,
    platform:       "LocalPro — https://www.localpro.asia",
    notice:         "This is a copy of the personal data we hold about your account.",
    user,
    jobs:           jobs.slice(0, 500),
    messages: {
      sent:         sentMessages.slice(0, 1000),
      received:     receivedMessages.slice(0, 1000),
    },
    reviews:        reviews.slice(0, 500),
    walletTransactions: walletTxs,
    providerProfile:    providerProfile ?? null,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="localpro-data-export-${currentUser.userId}.json"`,
    },
  });
});
