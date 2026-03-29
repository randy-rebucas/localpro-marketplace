import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { userRepository, notificationRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

/** PATCH /api/admin/kyc/[userId] — approve or reject KYC */
export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const adminUser = await requireUser();
  requireCapability(adminUser, "manage_kyc");

  const { userId } = await params;
  assertObjectId(userId, "userId");
  const body = await req.json().catch(() => ({}));
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { action, reason } = parsed.data;

  const target = await userRepository.getDocById(userId);
  if (!target) throw new NotFoundError("User");

  if (action === "approve") {
    target.kycStatus = "approved";
    target.kycRejectionReason = undefined;
    target.isVerified = true; // also sets them as verified
  } else {
    target.kycStatus = "rejected";
    target.kycRejectionReason = reason ?? "Documents did not meet requirements";
  }
  await target.save();

  // Notify provider
  const note = await notificationRepository.create({
    userId,
    type: action === "approve" ? "account_approved" : "account_rejected",
    title: action === "approve" ? "KYC Approved" : "KYC Rejected",
    message: action === "approve"
      ? "Your identity documents have been verified. Your account is now fully verified!"
      : `Your KYC submission was rejected. Reason: ${reason ?? "Documents did not meet requirements"}`,
    data: {},
  });
  pushNotification(userId, note);

  return NextResponse.json({ message: `KYC ${action}d successfully` });
});
