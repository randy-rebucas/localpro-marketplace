/**
 * GET   /api/admin/agencies/[id] — agency detail (with staff, owner)
 * PATCH /api/admin/agencies/[id] — update plan / planStatus / suspend owner
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import AgencyProfile from "@/models/AgencyProfile";
import User from "@/models/User";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: RouteCtx,
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_agencies");

  await connectDB();

  const { id } = await params;
  const agency = await AgencyProfile.findById(id)
    .populate("providerId", "name email phone avatar isVerified isSuspended accountType createdAt")
    .populate("staff.userId", "name email avatar isVerified isSuspended")
    .lean();

  if (!agency) throw new NotFoundError("Agency");
  return NextResponse.json(agency);
});

const UpdateSchema = z.object({
  plan:           z.enum(["starter", "growth", "pro", "enterprise"]).optional(),
  planStatus:     z.enum(["active", "past_due", "cancelled"]).optional(),
  /** Pass true to suspend, false to unsuspend the agency owner */
  suspendOwner:   z.boolean().optional(),
  defaultWorkerSharePct: z.number().int().min(0).max(100).optional(),
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: RouteCtx,
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_agencies");

  await connectDB();

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const agency = await AgencyProfile.findById(id);
  if (!agency) throw new NotFoundError("Agency");

  const { plan, planStatus, suspendOwner, defaultWorkerSharePct } = parsed.data;

  if (plan       !== undefined) agency.plan       = plan;
  if (planStatus !== undefined) agency.planStatus = planStatus;
  if (defaultWorkerSharePct !== undefined) agency.defaultWorkerSharePct = defaultWorkerSharePct;
  await agency.save();

  if (suspendOwner !== undefined) {
    await User.updateOne(
      { _id: agency.providerId },
      { $set: { isSuspended: suspendOwner } }
    );
  }

  return NextResponse.json({ message: "Agency updated." });
});
