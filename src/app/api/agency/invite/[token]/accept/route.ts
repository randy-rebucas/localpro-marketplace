import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import AgencyInvite from "@/models/AgencyInvite";
import AgencyProfile from "@/models/AgencyProfile";
import User from "@/models/User";

/** POST /api/agency/invite/[token]/accept — authenticated provider accepts the invite */
export const POST = withHandler(async (
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) => {
  const user = await requireUser();
  if (user.role !== "provider") {
    throw new ForbiddenError("Only provider accounts can accept agency invitations.");
  }

  const { token } = await ctx.params;
  if (!token) throw new ValidationError("Invalid invite link.");

  await connectDB();

  const invite = await AgencyInvite.findOne({ token });
  if (!invite) throw new NotFoundError("Invite not found or already used.");

  if (invite.acceptedAt) throw new ConflictError("This invite has already been accepted.");

  if (invite.expiresAt < new Date()) {
    throw new ValidationError("This invite link has expired. Please ask the agency to send a new one.");
  }

  // Verify email matches the authenticated user
  const currentUser = await User.findById(user.userId, "email agencyId").lean();
  if (!currentUser) throw new NotFoundError("User");

  if (currentUser.email?.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
    throw new ForbiddenError("This invite was sent to a different email address.");
  }

  if (currentUser.agencyId) {
    throw new ConflictError("You are already a member of an agency. Leave your current agency first.");
  }

  // Load the agency and add the user as staff
  const agency = await AgencyProfile.findById(invite.agencyId);
  if (!agency) throw new NotFoundError("Agency no longer exists.");

  // Guard against double-entry
  const alreadyMember = agency.staff.some((s) => String(s.userId) === user.userId);
  if (alreadyMember) throw new ConflictError("You are already a staff member of this agency.");

  agency.staff.push({
    userId: new mongoose.Types.ObjectId(user.userId),
    role: invite.role,
    joinedAt: new Date(),
    workerSharePct: 0, // will use agency defaultWorkerSharePct
    _id: new mongoose.Types.ObjectId(),
  });
  await agency.save();

  // Set agencyId on user and mark invite as accepted
  await Promise.all([
    User.updateOne({ _id: user.userId }, { $set: { agencyId: agency._id } }),
    AgencyInvite.updateOne({ _id: invite._id }, { $set: { acceptedAt: new Date(), invitedUserId: user.userId } }),
  ]);

  return NextResponse.json({
    message: `You have successfully joined ${agency.name} as ${invite.role}.`,
    agencyId: String(agency._id),
    agencyName: agency.name,
    role: invite.role,
  });
});
