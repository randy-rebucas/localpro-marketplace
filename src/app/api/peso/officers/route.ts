import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { pesoService } from "@/services/peso.service";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "peso");

  const office = await pesoService.getMyOffice(user.userId);
  return NextResponse.json(office);
});

const AddOfficerSchema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const parsed = AddOfficerSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await pesoService.addOfficer(user.userId, parsed.data);
  return NextResponse.json(result, { status: 201 });
});
