import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAtEquipmentLimit, getEquipmentLimit, PLAN_LABELS } from "@/lib/businessPlan";
import AgencyProfile from "@/models/AgencyProfile";

const EquipmentSchema = z.object({
  name:     z.string().min(1).max(200),
  type:     z.string().max(100).optional().default(""),
  serialNo: z.string().max(100).optional().default(""),
  status:   z.enum(["available", "in_use", "maintenance", "retired"]).optional().default("available"),
  notes:    z.string().max(500).optional().default(""),
});

const OID_RE = /^[a-f\d]{24}$/i;

const UpdateSchema = z.object({
  equipmentId: z.string().regex(OID_RE, "Invalid equipmentId"),
  name:        z.string().min(1).max(200).optional(),
  type:        z.string().max(100).optional(),
  serialNo:    z.string().max(100).optional(),
  status:      z.enum(["available", "in_use", "maintenance", "retired"]).optional(),
  notes:       z.string().max(500).optional(),
});

async function requireProvider() {
  const u = await requireUser();
  if (u.role !== "provider") throw new ForbiddenError();
  return u;
}

function toOid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

/** GET /api/provider/agency/equipment */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireProvider();

  const rl = await checkRateLimit(`agency-equipment:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();
  const agency = await AgencyProfile.findOne(
    { providerId: toOid(user.userId) },
    "equipment"
  ).lean();
  if (!agency) return NextResponse.json({ equipment: [], hasAgency: false });
  return NextResponse.json({ equipment: agency.equipment ?? [], hasAgency: true });
});

/** POST /api/provider/agency/equipment — add item */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json().catch(() => ({}));
  const parsed = EquipmentSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const providerId = toOid(user.userId);

  // Verify agency exists and check equipment limit
  const agency = await AgencyProfile.findOne({ providerId }, "equipment plan");
  if (!agency) throw new NotFoundError("AgencyProfile");

  // Check equipment limit based on plan
  if (isAtEquipmentLimit(agency.plan, (agency.equipment ?? []).length)) {
    const limit = getEquipmentLimit(agency.plan);
    const label = PLAN_LABELS[agency.plan];
    throw new ForbiddenError(
      `Your ${label} plan allows up to ${limit} equipment slot${limit === 1 ? "" : "s"}. Upgrade your plan to add more equipment.`
    );
  }

  // Build item with explicit _id so we can return it without a second DB read
  const newId   = new mongoose.Types.ObjectId();
  const newItem = {
    _id:          newId,
    name:         parsed.data.name,
    type:         parsed.data.type,
    serialNo:     parsed.data.serialNo,
    status:       parsed.data.status,
    notes:        parsed.data.notes,
    assignedToId: null,
  };

  // $push initialises the array in MongoDB if the field is absent on legacy docs
  const result = await AgencyProfile.collection.updateOne(
    { providerId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $push: { equipment: newItem } } as any
  );

  if (result.modifiedCount === 0) {
    throw new NotFoundError("AgencyProfile");
  }

  return NextResponse.json(
    { item: { ...newItem, _id: String(newId) } },
    { status: 201 }
  );
});

/** PATCH /api/provider/agency/equipment — update item */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const { equipmentId, ...fields } = parsed.data;

  const setFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) setFields[`equipment.$.${k}`] = v;
  }

  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: toOid(user.userId), "equipment._id": toOid(equipmentId) },
    { $set: setFields },
    { new: true, projection: { equipment: 1 } }
  ).lean();
  if (!agency) throw new NotFoundError("Equipment");

  const item = (agency.equipment ?? []).find((e) => String(e._id) === equipmentId);
  return NextResponse.json({ item });
});

/** DELETE /api/provider/agency/equipment?equipmentId=<id> */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  await connectDB();

  const equipmentId = new URL(req.url).searchParams.get("equipmentId");
  if (!equipmentId) throw new ValidationError("equipmentId is required.");
  if (!OID_RE.test(equipmentId)) throw new ValidationError("Invalid equipmentId.");

  const result = await AgencyProfile.collection.updateOne(
    { providerId: toOid(user.userId) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $pull: { equipment: { _id: toOid(equipmentId) } } } as any
  );

  if (result.matchedCount === 0) throw new NotFoundError("AgencyProfile");

  return NextResponse.json({ message: "Equipment removed." });
});
