import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { userRepository } from "@/repositories";

/** GET /api/admin/kyc — list all users (providers + clients) with KYC submissions */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_kyc");

  const users = await userRepository.findUsersByKycStatus(
    ["pending", "approved", "rejected"]
  );

  return NextResponse.json(users);
});
