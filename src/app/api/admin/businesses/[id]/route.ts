/**
 * GET   /api/admin/businesses/[id] — business org detail
 * PATCH /api/admin/businesses/[id] — update plan / planStatus / suspend owner
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import BusinessOrganization from "@/models/BusinessOrganization";
import BusinessMember from "@/models/BusinessMember";
import User from "@/models/User";

import { checkRateLimit } from "@/lib/rateLimit";
type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: RouteCtx,
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_businesses");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { id } = await params;

  const [org, members] = await Promise.all([
    BusinessOrganization.findById(id)
      .populate("ownerId", "name email phone avatar isVerified isSuspended accountType createdAt")
      .lean(),
    BusinessMember.find({ orgId: id })
      .populate("userId", "name email avatar isVerified")
      .lean(),
  ]);

  if (!org) throw new NotFoundError("Business organization");
  return NextResponse.json({ org, members });
});

const UpdateSchema = z.object({
  plan:         z.enum(["starter", "growth", "pro", "enterprise"]).optional(),
  planStatus:   z.enum(["active", "past_due", "cancelled"]).optional(),
  suspendOwner: z.boolean().optional(),
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: RouteCtx,
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_businesses");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const org = await BusinessOrganization.findById(id);
  if (!org) throw new NotFoundError("Business organization");

  const { plan, planStatus, suspendOwner } = parsed.data;

  if (plan       !== undefined) org.plan       = plan;
  if (planStatus !== undefined) org.planStatus = planStatus;
  await org.save();

  if (suspendOwner !== undefined) {
    await User.updateOne(
      { _id: org.ownerId },
      { $set: { isSuspended: suspendOwner } }
    );
  }

  return NextResponse.json({ message: "Business organization updated." });
});
