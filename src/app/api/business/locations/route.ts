import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { businessService } from "@/services/business.service";

const LocationSchema = z.object({
  orgId: z.string().min(1),
  label: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  monthlyBudget: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
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
});

/** POST /api/business/locations — add a location to an org */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json();
  const parsed = LocationSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, ...locationData } = parsed.data;
  const org = await businessService.addLocation(orgId, user.userId, locationData);
  return NextResponse.json({ org }, { status: 201 });
});

/** PATCH /api/business/locations — update a location */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json();
  const parsed = UpdateLocationSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, locationId, ...updates } = parsed.data;
  const org = await businessService.updateLocation(orgId, locationId, user.userId, updates);
  return NextResponse.json({ org });
});

/** DELETE /api/business/locations — remove a location */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.role !== "client") throw new ForbiddenError();

  const { searchParams } = new URL(req.url);
  const orgId      = searchParams.get("orgId");
  const locationId = searchParams.get("locationId");
  if (!orgId || !locationId) throw new ValidationError("orgId and locationId query params required.");

  const org = await businessService.removeLocation(orgId, locationId, user.userId);
  return NextResponse.json({ org });
});
