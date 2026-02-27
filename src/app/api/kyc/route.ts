import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import User from "@/models/User";

const SubmitKycSchema = z.object({
  documents: z.array(
    z.object({
      type: z.enum(["government_id", "business_permit", "selfie_with_id", "other"]),
      url: z.string().url("Invalid document URL"),
    })
  ).min(1, "At least one document is required"),
});

/** POST /api/kyc — provider submits KYC documents */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const body = await req.json();
  const parsed = SubmitKycSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  await User.findByIdAndUpdate(user.userId, {
    kycStatus: "pending",
    kycDocuments: parsed.data.documents.map((d) => ({
      ...d,
      uploadedAt: new Date(),
    })),
    kycRejectionReason: null,
  });

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
