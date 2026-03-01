import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/** GET /api/admin/kyc — list all providers with pending/submitted KYC */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_kyc");

  await connectDB();

  const providers = await User.find({
    role: "provider",
    kycStatus: { $in: ["pending", "approved", "rejected"] },
  })
    .select("name email kycStatus kycDocuments kycRejectionReason createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(providers);
});
