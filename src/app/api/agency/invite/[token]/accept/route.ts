import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { userRepository } from "@/repositories";
import AgencyInvite from "@/models/AgencyInvite";
import AgencyProfile from "@/models/AgencyProfile";

/** POST /api/agency/invite/[token]/accept — authenticated provider accepts the invite */
export const POST = withHandler(async (
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) => {
  const user = await requireUser();
  if (user.role !== "provider") {
    throw new ForbiddenError("Only provider accounts can accept agency invitations.");
  }
  await requireCsrfToken(req, user);

  const rl = await checkRateLimit(`agency-invite-accept:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { token } = await ctx.params;
  if (!token) throw new ValidationError("Invalid invite link.");

  await connectDB();

  const invite = await AgencyInvite.findOne({ token });
  if (!invite) throw new NotFoundError("Invite not found or already used.");

  if (invite.acceptedAt) throw new ConflictError("This invite has already been accepted.");

  if (invite.expiresAt < new Date()) {
    throw new ValidationError("This invite link has expired. Please ask the agency to send a new one.");
  }

  const currentUser = await userRepository.findById(user.userId);
  if (!currentUser) throw new NotFoundError("User");

  if (currentUser.email?.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
    throw new ForbiddenError("This invite was sent to a different email address.");
  }

  if ((currentUser as any).agencyId) {
    throw new ConflictError("You are already a member of an agency. Leave your current agency first.");
  }

  const agency = await AgencyProfile.findById(invite.agencyId);
  if (!agency) throw new NotFoundError("Agency no longer exists.");

  const alreadyMember = agency.staff.some((s) => String(s.userId) === user.userId);
  if (alreadyMember) throw new ConflictError("You are already a staff member of this agency.");

  agency.staff.push({
    userId: new mongoose.Types.ObjectId(user.userId),
    role: invite.role,
    joinedAt: new Date(),
    workerSharePct: 0,
    _id: new mongoose.Types.ObjectId(),
  });
  await agency.save();

  await Promise.all([
    userRepository.updateById(user.userId, { agencyId: agency._id }),
    AgencyInvite.updateOne({ _id: invite._id }, { $set: { acceptedAt: new Date(), invitedUserId: user.userId } }),
  ]);

  return NextResponse.json({
    message: `You have successfully joined ${agency.name} as ${invite.role}.`,
    agencyId: String(agency._id),
    agencyName: agency.name,
    role: invite.role,
  });
});
