import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/user/delete-request
 *
 * Submits a data deletion request for the authenticated user.
 * The request is logged to ActivityLog and an alert is sent to the support
 * team. An admin manually processes deletions within 30 days as required by
 * the Data Privacy Act of 2012 (Philippines).
 *
 * Rate-limited to 1 request per 7 days per user.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const currentUser = await requireUser();

  // 1 request per 7 days per user
  const rl = await checkRateLimit(`user-delete-req:${currentUser.userId}`, {
    windowMs: 7 * 24 * 60 * 60_000,
    max:      1,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "A deletion request has already been submitted. Please allow up to 30 days for processing." },
      { status: 429 }
    );
  }

  const body = await req.json() as { reason?: string };
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "No reason provided";

  await connectDB();

  const user = await User.findById(currentUser.userId).select("name email").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Log to ActivityLog for admin visibility
  await ActivityLog.create({
    userId:    currentUser.userId,
    action:    "account_deletion_requested",
    details:   { reason, requestedAt: new Date().toISOString() },
    ipAddress: req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown",
  });

  // Sanitise all user-controlled strings before embedding in HTML
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeId     = esc(currentUser.userId);
  const safeName   = esc(String((user as { name?: string }).name ?? "N/A"));
  const safeEmail  = esc(String((user as { email?: string }).email ?? "N/A"));
  const safeReason = esc(reason);

  // Notify support via email
  const adminEmail = process.env.ADMIN_SUPPORT_EMAIL ?? process.env.EMAIL_FROM ?? "support@localpro.asia";
  await sendEmail(
    adminEmail,
    `[Action Required] Account deletion request \u2014 ${safeName} (${safeEmail})`,
    `
      <p>A user has submitted an account deletion request.</p>
      <table>
        <tr><td><strong>User ID</strong></td><td>${safeId}</td></tr>
        <tr><td><strong>Name</strong></td><td>${safeName}</td></tr>
        <tr><td><strong>Email</strong></td><td>${safeEmail}</td></tr>
        <tr><td><strong>Reason</strong></td><td>${safeReason}</td></tr>
        <tr><td><strong>Requested At</strong></td><td>${new Date().toISOString()}</td></tr>
      </table>
      <p>Please process this request within 30 days in compliance with the Data Privacy Act of 2012.</p>
      <p>To process: go to Admin &rarr; Users &rarr; [user] &rarr; Anonymise Account.</p>
    `
  );

  return NextResponse.json({
    success:   true,
    message:   "Your deletion request has been received. We will process it within 30 days.",
    requestId: currentUser.userId,
  });
});
