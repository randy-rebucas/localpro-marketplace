import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoRepository } from "@/repositories/peso.repository";
import { ValidationError, NotFoundError } from "@/lib/errors";

/** PATCH — toggle isActive only */
export const PATCH = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const { id } = await ctx.params;
  const body = await req.json();

  if (typeof body.isActive !== "boolean") {
    throw new ValidationError("isActive (boolean) is required");
  }

  const updated = await pesoRepository.toggleOfficeActive(id, body.isActive);
  if (!updated) throw new NotFoundError("PESO office not found");

  return NextResponse.json(updated);
});

/** PUT — full update of office details */
export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const { id } = await ctx.params;
  const body = await req.json();
  const { officeName, municipality, region, contactEmail, headOfficerId, officerIds } = body;

  if (!officeName || !municipality || !region || !contactEmail || !headOfficerId) {
    throw new ValidationError(
      "officeName, municipality, region, contactEmail, and headOfficerId are all required"
    );
  }

  const patch: Record<string, unknown> = {
    officeName: officeName.trim(),
    municipality: municipality.trim(),
    region: region.trim(),
    contactEmail: contactEmail.trim().toLowerCase(),
    headOfficerId,
  };
  if (Array.isArray(officerIds)) patch.officerIds = officerIds;

  const updated = await pesoRepository.updateOffice(id, patch);

  if (!updated) throw new NotFoundError("PESO office not found");
  return NextResponse.json(updated);
});

/** DELETE — remove the office entirely */
export const DELETE = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const { id } = await ctx.params;
  const deleted = await pesoRepository.deleteOffice(id);
  if (!deleted) throw new NotFoundError("PESO office not found");

  return NextResponse.json({ success: true });
});
