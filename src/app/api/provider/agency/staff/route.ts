import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { isAtMemberLimit, getMemberLimit, PLAN_LABELS } from "@/lib/businessPlan";
import AgencyProfile from "@/models/AgencyProfile";
import User from "@/models/User";

const AddSchema = z.object({
  agencyId: z.string(),
  userId:   z.string(),
  role:     z.enum(["worker", "dispatcher", "supervisor", "finance"]).default("worker"),
});

const UpdateSchema = z.object({
  agencyId: z.string(),
  staffId:  z.string(),
  role:     z.enum(["worker", "dispatcher", "supervisor", "finance"]),
});

/** GET /api/provider/agency/staff?agencyId=<id>[&searchEmail=<email>] */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  await connectDB();

  const { searchParams } = new URL(req.url);
  const searchEmail = searchParams.get("searchEmail");

  if (searchEmail) {
    const found = await User.findOne({ email: searchEmail.toLowerCase() }, "name email avatar role").lean();
    return NextResponse.json({ user: found ?? null });
  }

  const agency = await AgencyProfile.findOne({ providerId: user.userId })
    .populate("staff.userId", "name email avatar isVerified isSuspended")
    .lean();

  // New accounts: return empty list instead of 404
  if (!agency) return NextResponse.json({ staff: [] });

  return NextResponse.json({ staff: agency.staff });
});

/** POST /api/provider/agency/staff — add staff member */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  // Check staff limit based on plan
  if (isAtMemberLimit(agency.plan, agency.staff.length)) {
    const limit = getMemberLimit(agency.plan);
    const label = PLAN_LABELS[agency.plan];
    throw new ForbiddenError(
      `Your ${label} plan allows up to ${limit} staff member${limit === 1 ? "" : "s"}. Upgrade your plan to add more staff.`
    );
  }

  const alreadyMember = agency.staff.some(
    (s) => String(s.userId) === parsed.data.userId
  );
  if (alreadyMember) throw new ConflictError("User is already a staff member.");

  const targetUser = await User.findById(parsed.data.userId, "_id name").lean();
  if (!targetUser) throw new NotFoundError("User");

  agency.staff.push({
    userId: targetUser._id as unknown as mongoose.Types.ObjectId,
    role: parsed.data.role,
    joinedAt: new Date(),
    workerSharePct: 0, // uses agency defaultWorkerSharePct at payout time
    _id: new mongoose.Types.ObjectId(),
  });
  await agency.save();

  // Mark the user as belonging to this agency so the sidebar knows
  await User.updateOne({ _id: targetUser._id }, { $set: { agencyId: agency._id } });

  return NextResponse.json({ message: "Staff member added." }, { status: 201 });
});

/** PATCH /api/provider/agency/staff — update staff role */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  const member = agency.staff.find((s) => String(s._id) === parsed.data.staffId);
  if (!member) throw new NotFoundError("Staff member");

  member.role = parsed.data.role;
  await agency.save();

  return NextResponse.json({ message: "Staff role updated." });
});

/** DELETE /api/provider/agency/staff?agencyId=<id>&staffId=<id> */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  await connectDB();

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  if (!staffId) throw new ValidationError("staffId is required.");

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  const before = agency.staff.length;
  const removed = agency.staff.find((s) => String(s._id) === staffId);
  agency.staff = agency.staff.filter((s) => String(s._id) !== staffId) as typeof agency.staff;
  if (agency.staff.length === before) throw new NotFoundError("Staff member");

  await agency.save();

  // Clear agencyId on the removed user's account
  if (removed) {
    await User.updateOne({ _id: removed.userId }, { $set: { agencyId: null } });
  }

  return NextResponse.json({ message: "Staff member removed." });
});
