import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";
import AgencyInvite from "@/models/AgencyInvite";
import User from "@/models/User";
import { sendAgencyInviteEmail } from "@/lib/email";

const CreateSchema = z.object({
  email: z.string().email("Invalid email address."),
  role: z.enum(["worker", "dispatcher", "supervisor", "finance"]).default("worker"),
});

/** POST /api/provider/agency/invites  body: { email, role } */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const rl = await checkRateLimit(`agency-invites:${user.userId}`, { windowMs: 3_600_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  const email = parsed.data.email.toLowerCase();

  // Check if this person is already a staff member
  const existingUser = await User.findOne({ email }, "_id agencyId").lean();
  if (existingUser && String(existingUser.agencyId) === String(agency._id)) {
    throw new ConflictError("This person is already a member of your agency.");
  }

  // Check for an existing pending invite
  const existing = await AgencyInvite.findOne({
    agencyId: agency._id,
    invitedEmail: email,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (existing) {
    throw new ConflictError("A pending invite for this email already exists.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await AgencyInvite.create({
    agencyId: agency._id,
    agencyOwnerId: user.userId,
    agencyName: agency.name,
    invitedEmail: email,
    invitedUserId: existingUser?._id ?? null,
    role: parsed.data.role,
    token,
    expiresAt,
    acceptedAt: null,
  });

  // Send invite email (fire-and-forget)
  const recipientName = existingUser
    ? (await User.findById(existingUser._id, "name").lean())?.name ?? null
    : null;

  sendAgencyInviteEmail(email, recipientName, agency.name, parsed.data.role, token).catch(
    (err) => console.error("[AGENCY_INVITE] Email failed:", err)
  );

  return NextResponse.json({ message: "Invite sent successfully." }, { status: 201 });
});

/** GET /api/provider/agency/invites — list all pending invites for the agency */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }, "_id").lean();
  if (!agency) return NextResponse.json({ invites: [] });

  const invites = await AgencyInvite.find(
    { agencyId: agency._id },
    "invitedEmail role expiresAt acceptedAt createdAt"
  )
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invites });
});

/** DELETE /api/provider/agency/invites?id=<inviteId> — revoke pending invite */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ValidationError("Missing invite id.");
  assertObjectId(id, "inviteId");

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }, "_id").lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const invite = await AgencyInvite.findOneAndDelete({
    _id: id,
    agencyId: agency._id,
    acceptedAt: null,
  });
  if (!invite) throw new NotFoundError("Invite not found or already accepted.");

  return NextResponse.json({ message: "Invite revoked." });
});
