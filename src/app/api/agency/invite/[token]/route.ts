import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import AgencyInvite from "@/models/AgencyInvite";
import User from "@/models/User";

/** GET /api/agency/invite/[token] — public: fetch invite details for the acceptance page */
export const GET = withHandler(async (
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) => {
  const { token } = await ctx.params;
  if (!token) throw new ValidationError("Invalid invite link.");

  await connectDB();

  const invite = await AgencyInvite.findOne({ token }).lean();
  if (!invite) throw new NotFoundError("Invite not found or has already been used.");

  if (invite.acceptedAt) {
    throw new ValidationError("This invite has already been accepted.");
  }

  if (invite.expiresAt < new Date()) {
    throw new ValidationError("This invite link has expired. Please ask the agency to send a new one.");
  }

  // Check if the invited email already has an account so the UI can direct to login
  const existingUser = await User.findOne(
    { email: invite.invitedEmail },
    "_id name role"
  ).lean();

  return NextResponse.json({
    invite: {
      agencyName: invite.agencyName,
      invitedEmail: invite.invitedEmail,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
    hasAccount: !!existingUser,
    accountRole: existingUser?.role ?? null,
  });
});
