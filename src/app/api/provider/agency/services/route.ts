import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAtServiceLimit, getServiceLimit, PLAN_LABELS } from "@/lib/businessPlan";
import AgencyProfile from "@/models/AgencyProfile";

const OID_RE = /^[a-f\d]{24}$/i;

const ServiceSchema = z.object({
  title:       z.string().min(2).max(200),
  description: z.string().max(1000).optional().default(""),
  category:    z.string().max(100).optional().default(""),
  minPrice:    z.number().min(0).optional().default(0),
  maxPrice:    z.number().min(0).optional().default(0),
  duration:    z.string().max(100).optional().default(""),
  isActive:    z.boolean().optional().default(true),
});

// Do NOT derive from ServiceSchema.partial() — it carries .default() values
// which would cause Zod to inject "" / 0 for omitted fields, wiping real data.
const UpdateSchema = z.object({
  serviceId:   z.string().regex(OID_RE, "Invalid serviceId"),
  title:       z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  category:    z.string().max(100).optional(),
  minPrice:    z.number().min(0).optional(),
  maxPrice:    z.number().min(0).optional(),
  duration:    z.string().max(100).optional(),
  isActive:    z.boolean().optional(),
});

async function requireProvider() {
  const u = await requireUser();
  if (u.role !== "provider") throw new ForbiddenError();
  return u;
}

function toOid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

/** GET /api/provider/agency/services */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireProvider();

  const rl = await checkRateLimit(`agency-services:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();
  const agency = await AgencyProfile.findOne(
    { providerId: toOid(user.userId) },
    "services"
  ).lean();
  return NextResponse.json({ services: agency?.services ?? [] });
});

/** POST /api/provider/agency/services — add a service */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json().catch(() => ({}));
  const parsed = ServiceSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const providerId = toOid(user.userId);

  // Verify agency exists and check for duplicate title
  const agency = await AgencyProfile.findOne({ providerId }, "services.title plan").lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  // Check service limit based on plan
  if (isAtServiceLimit(agency.plan, (agency.services ?? []).length)) {
    const limit = getServiceLimit(agency.plan);
    const label = PLAN_LABELS[agency.plan];
    throw new ForbiddenError(
      `Your ${label} plan allows up to ${limit} service${limit === 1 ? "" : "s"}. Upgrade your plan to add more services.`
    );
  }

  const titleLower = parsed.data.title.toLowerCase();
  const duplicate  = (agency.services ?? []).some(
    (s) => s.title.toLowerCase() === titleLower
  );
  if (duplicate) throw new ValidationError(`A service named "${parsed.data.title}" already exists.`);

  const newId   = new mongoose.Types.ObjectId();
  const newItem = {
    _id:         newId,
    title:       parsed.data.title,
    description: parsed.data.description,
    category:    parsed.data.category,
    minPrice:    parsed.data.minPrice,
    maxPrice:    parsed.data.maxPrice,
    duration:    parsed.data.duration,
    isActive:    parsed.data.isActive,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await AgencyProfile.collection.updateOne(
    { providerId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $push: { services: newItem } } as any
  );

  if (result.modifiedCount === 0) throw new NotFoundError("AgencyProfile");

  return NextResponse.json({ service: { ...newItem, _id: String(newId) } }, { status: 201 });
});

/** PATCH /api/provider/agency/services — update a service */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const { serviceId, ...fields } = parsed.data;

  const setFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) setFields[`services.$.${k}`] = v;
  }

  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: toOid(user.userId), "services._id": toOid(serviceId) },
    { $set: setFields },
    { new: true, projection: { services: 1 } }
  ).lean();
  if (!agency) throw new NotFoundError("Service");

  const svc = (agency.services ?? []).find((s) => String(s._id) === serviceId);
  return NextResponse.json({ service: svc });
});

/** DELETE /api/provider/agency/services?serviceId=<id> */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  await connectDB();

  const serviceId = new URL(req.url).searchParams.get("serviceId");
  if (!serviceId) throw new ValidationError("serviceId is required.");
  if (!OID_RE.test(serviceId)) throw new ValidationError("Invalid serviceId.");

  const result = await AgencyProfile.collection.updateOne(
    { providerId: toOid(user.userId) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $pull: { services: { _id: toOid(serviceId) } } } as any
  );

  if (result.matchedCount === 0) throw new NotFoundError("AgencyProfile");

  return NextResponse.json({ message: "Service removed." });
});
