import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
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
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, locationId, providerId, add } = parsed.data;
  const org = await businessService.togglePreferredProvider(
    orgId, locationId, providerId, user.userId, add
  );
  return NextResponse.json({ org });
});
