import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
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
export const GET = withHandler(async () => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError("Only clients can access business features.");

  const org = await businessService.getOrCreateOrg(user.userId);
  return NextResponse.json({ org });
});

/** POST /api/business/org — create a new business org */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError("Only clients can create a business organization.");

  const body = await req.json();
  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const org = await businessService.createOrg(user.userId, parsed.data);
  return NextResponse.json({ org }, { status: 201 });
});

/** PATCH /api/business/org — update org details */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json();
  const { orgId, ...rest } = body as { orgId?: string } & Record<string, unknown>;
  if (!orgId) throw new ValidationError("orgId is required.");

  const parsed = UpdateOrgSchema.safeParse(rest);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const org = await businessService.updateOrg(orgId, user.userId, parsed.data);
  return NextResponse.json({ org });
});
