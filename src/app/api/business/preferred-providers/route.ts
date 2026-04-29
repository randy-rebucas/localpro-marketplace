import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";

const Schema = z.object({
  orgId:      z.string().min(1),
  locationId: z.string().min(1),
  providerId: z.string().min(1),
  add:        z.boolean(),
});

/**
 * POST /api/business/preferred-providers
 * Body: { orgId, locationId, providerId, add: true|false }
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-pref-providers:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, locationId, providerId, add } = parsed.data;
  assertObjectId(orgId, "orgId");
  assertObjectId(locationId, "locationId");
  assertObjectId(providerId, "providerId");

  const org = await businessService.togglePreferredProvider(orgId, locationId, providerId, user.userId, add);
  return NextResponse.json({ org });
});
