import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { businessService } from "@/services/business.service";

const LocationSchema = z.object({
  orgId: z.string().min(1),
  label: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  monthlyBudget: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
  managerId: z.string().nullable().optional(),
  allowedCategories: z.array(z.string()).optional(),
});

const UpdateLocationSchema = z.object({
  orgId: z.string().min(1),
  locationId: z.string().min(1),
  label: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(500).optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  monthlyBudget: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  managerId: z.string().nullable().optional(),
  allowedCategories: z.array(z.string()).optional(),
});

/** POST /api/business/locations — add a location to an org */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-locations-post:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = LocationSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, ...locationData } = parsed.data;
  assertObjectId(orgId, "orgId");

  const org = await businessService.addLocation(orgId, user.userId, locationData);
  return NextResponse.json({ org }, { status: 201 });
});

/** PATCH /api/business/locations — update a location */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-locations-patch:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = UpdateLocationSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, locationId, ...updates } = parsed.data;
  assertObjectId(orgId, "orgId");
  assertObjectId(locationId, "locationId");

  const org = await businessService.updateLocation(orgId, locationId, user.userId, updates);
  return NextResponse.json({ org });
});

/** DELETE /api/business/locations — remove a location */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-locations-delete:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const orgId      = searchParams.get("orgId");
  const locationId = searchParams.get("locationId");
  if (!orgId || !locationId) throw new ValidationError("orgId and locationId query params required.");
  assertObjectId(orgId, "orgId");
  assertObjectId(locationId, "locationId");

  const org = await businessService.removeLocation(orgId, locationId, user.userId);
  return NextResponse.json({ org });
});
