import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { userRepository } from "@/repositories";

/** GET /api/admin/kyc — list all providers with pending/submitted KYC */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_kyc");

  const providers = await userRepository.findProvidersByKycStatus(
    ["pending", "approved", "rejected"]
  );

  return NextResponse.json(providers);
});
