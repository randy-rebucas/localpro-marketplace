import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import User from "@/models/User";
import { userRepository, notificationRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";

const SubmitKycSchema = z.object({
  documents: z.array(
    z.object({
      type: z.enum(["government_id", "tesda_certificate", "business_permit", "selfie_with_id", "other"]),
      url: z.string().url("Invalid document URL"),
    })
  ).min(1, "At least one document is required"),
});

/** POST /api/kyc — authenticated user submits KYC documents */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json();
  const parsed = SubmitKycSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const updatedUser = await User.findByIdAndUpdate(
    user.userId,
    {
      kycStatus: "pending",
      kycDocuments: parsed.data.documents.map((d) => ({
        ...d,
        uploadedAt: new Date(),
      })),
      kycRejectionReason: null,
    },
    { new: true }
  ).select("name role").lean() as { name: string; role: string } | null;

  // Notify all admins and staff about the new KYC submission (fire-and-forget)
  (async () => {
    try {
      const staffList = await userRepository.findAdminsAndStaff();
      await Promise.all(
        staffList.map(async (admin) => {
          const adminId = admin._id.toString();
          const note = await notificationRepository.create({
            userId: adminId,
            type: "kyc_submitted",
            title: "New KYC Submission",
            message: `${updatedUser?.name ?? "A user"} has submitted identity documents for review.`,
            data: { submittedBy: user.userId },
          });
          pushNotification(adminId, note);
        })
      );
    } catch (err) {
      console.error("[KYC] Failed to notify admins:", err);
    }
  })();

  return NextResponse.json({ message: "KYC documents submitted for review" });
});

/** GET /api/kyc — get own KYC status */
export const GET = withHandler(async () => {
  const user = await requireUser();
  await connectDB();

  const u = await User.findById(user.userId)
    .select("kycStatus kycDocuments kycRejectionReason")
    .lean() as { kycStatus?: string; kycDocuments?: unknown[]; kycRejectionReason?: string } | null;

  return NextResponse.json({
    kycStatus: u?.kycStatus ?? "none",
    kycDocuments: u?.kycDocuments ?? [],
    kycRejectionReason: u?.kycRejectionReason ?? null,
  });
});
