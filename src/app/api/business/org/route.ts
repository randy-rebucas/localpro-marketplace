import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["hotel", "company", "other"]).optional(),
  defaultMonthlyBudget: z.number().min(0).optional(),
});

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  type: z.enum(["hotel", "company", "other"]).optional(),
  logo: z.string().url().optional(),
  defaultMonthlyBudget: z.number().min(0).optional(),
});

/** GET /api/business/org — fetch the caller's business org (if any) */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError("Only clients can access business features.");

  const rl = await checkRateLimit(`biz-org-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const org = await businessService.getOrCreateOrg(user.userId);
  return NextResponse.json({ org });
});

/** POST /api/business/org — create a new business org */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError("Only clients can create a business organization.");

  const rl = await checkRateLimit(`biz-org-post:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const org = await businessService.createOrg(user.userId, parsed.data);
  return NextResponse.json({ org }, { status: 201 });
});

/** PATCH /api/business/org — update org details */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-org-patch:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { orgId, ...rest } = body as { orgId?: string } & Record<string, unknown>;
  if (!orgId) throw new ValidationError("orgId is required.");
  assertObjectId(orgId, "orgId");

  const parsed = UpdateOrgSchema.safeParse(rest);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const org = await businessService.updateOrg(orgId, user.userId, parsed.data);
  return NextResponse.json({ org });
});
