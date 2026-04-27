import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";

const AddMemberSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["manager", "supervisor", "finance"]),
  locationAccess: z.array(z.string()).optional(),
});

const UpdateMemberSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["manager", "supervisor", "finance"]).optional(),
  locationAccess: z.array(z.string()).optional(),
});

/** GET /api/business/members?orgId=xxx[&searchEmail=xxx] */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-members-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const orgId       = searchParams.get("orgId");
  const searchEmail = searchParams.get("searchEmail");
  if (!orgId) throw new ValidationError("orgId query param required.");

  if (searchEmail) {
    const found = await businessService.searchUserByEmail(searchEmail, orgId, user.userId);
    return NextResponse.json({ user: found });
  }

  const members = await businessService.getMembers(orgId, user.userId);
  return NextResponse.json({ members });
});

/** POST /api/business/members — invite/add a member */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-members-post:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, ...rest } = parsed.data;
  assertObjectId(orgId, "orgId");
  assertObjectId(rest.userId, "userId");

  const member = await businessService.addMember(orgId, user.userId, rest);
  return NextResponse.json({ member }, { status: 201 });
});

/** PATCH /api/business/members — update a member's role or location access */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-members-patch:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = UpdateMemberSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, memberId, ...updates } = parsed.data;
  assertObjectId(orgId, "orgId");
  assertObjectId(memberId, "memberId");

  const member = await businessService.updateMember(orgId, memberId, user.userId, updates);
  return NextResponse.json({ member });
});

/** DELETE /api/business/members?orgId=xxx&memberId=yyy — remove a member */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-members-delete:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const orgId    = searchParams.get("orgId");
  const memberId = searchParams.get("memberId");
  if (!orgId || !memberId) throw new ValidationError("orgId and memberId query params required.");
  assertObjectId(orgId, "orgId");
  assertObjectId(memberId, "memberId");

  await businessService.removeMember(orgId, memberId, user.userId);
  return NextResponse.json({ success: true });
});
