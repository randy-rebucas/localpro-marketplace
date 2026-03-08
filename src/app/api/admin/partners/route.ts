import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoRepository } from "@/repositories/peso.repository";
import { ValidationError } from "@/lib/errors";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "active" | "inactive" | null (all)

  const filter: { isActive?: boolean } = {};
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  const offices = await pesoRepository.listAllOffices(filter);
  return NextResponse.json({ offices });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");

  const body = await req.json();
  const { officeName, municipality, region, contactEmail, headOfficerId } = body;

  if (!officeName || !municipality || !region || !contactEmail || !headOfficerId) {
    throw new ValidationError(
      "officeName, municipality, region, contactEmail, and headOfficerId are all required"
    );
  }

  const office = await pesoRepository.createOffice({
    officeName: officeName.trim(),
    municipality: municipality.trim(),
    region: region.trim(),
    contactEmail: contactEmail.trim().toLowerCase(),
    headOfficerId,
  });

  return NextResponse.json({ office }, { status: 201 });
});
