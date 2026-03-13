import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import AgencyProfile from "@/models/AgencyProfile";

async function requireProvider() {
  const u = await requireUser();
  if (u.role !== "provider") throw new ForbiddenError();
  return u;
}

const PermitSchema = z.object({
  title:  z.string().min(2).max(200),
  url:    z.string().max(500).optional().default(""),
  status: z.enum(["pending", "verified", "expired"]).optional().default("pending"),
});

const ComplianceSchema = z.object({
  tin:             z.string().max(50).optional(),
  vat:             z.string().max(50).optional(),
  taxStatus:       z.enum(["compliant", "pending", "not_provided"]).optional(),
  insuranceUrl:    z.string().max(500).nullable().optional(),
  insuranceStatus: z.enum(["pending", "verified", "expired", "none"]).optional(),
});

/** GET /api/provider/agency/compliance */
export const GET = withHandler(async () => {
  const user = await requireProvider();
  await connectDB();
  const agency = await AgencyProfile.findOne(
    { providerId: user.userId },
    "name compliance"
  ).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const c = agency.compliance ?? {};
  const compliance = {
    permits:         (c as Record<string, unknown>).permits         ?? [],
    insuranceUrl:    (c as Record<string, unknown>).insuranceUrl    ?? null,
    insuranceStatus: (c as Record<string, unknown>).insuranceStatus ?? "none",
    tin:             (c as Record<string, unknown>).tin             ?? "",
    vat:             (c as Record<string, unknown>).vat             ?? "",
    taxStatus:       (c as Record<string, unknown>).taxStatus       ?? "not_provided",
  };

  return NextResponse.json({ name: agency.name, compliance });
});

/** PATCH /api/provider/agency/compliance — update TIN/VAT/insurance top-level fields */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json();
  const parsed = ComplianceSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const setFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) setFields[`compliance.${k}`] = v;
  }

  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: user.userId },
    { $set: setFields },
    { new: true, select: "name compliance" }
  ).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  return NextResponse.json({ compliance: agency.compliance });
});

/** POST /api/provider/agency/compliance/permits — add a permit */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json();
  const parsed = PermitSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  // $push initialises compliance.permits if the array is missing on legacy docs
  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: user.userId },
    { $push: { "compliance.permits": parsed.data } },
    { new: true }
  ).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  return NextResponse.json({ permits: agency.compliance?.permits ?? [] }, { status: 201 });
});

/** DELETE /api/provider/agency/compliance?permitIndex=<n> — remove a permit by index */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  await connectDB();

  const idx = parseInt(new URL(req.url).searchParams.get("permitIndex") ?? "", 10);
  if (isNaN(idx) || idx < 0) throw new ValidationError("permitIndex is required.");

  // Read snapshot first so we can $pull by value — avoids in-memory splice race condition
  const snap = await AgencyProfile.findOne(
    { providerId: user.userId },
    "compliance.permits"
  ).lean();
  if (!snap) throw new NotFoundError("AgencyProfile");

  const permits = snap.compliance?.permits ?? [];
  if (idx >= permits.length) throw new ValidationError("Invalid permit index.");

  const target = permits[idx] as { title: string; url: string; status: string };

  // Atomic $pull — matches by exact field values, no race condition
  const updated = await AgencyProfile.findOneAndUpdate(
    { providerId: user.userId },
    { $pull: { "compliance.permits": { title: target.title, url: target.url, status: target.status } } },
    { new: true, select: "compliance.permits" }
  ).lean();

  return NextResponse.json({ permits: updated?.compliance?.permits ?? [] });
});
