import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";
import { ValidationError } from "@/lib/errors";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "peso");

  const office = await pesoService.getOfficeSettings(user.userId);
  return NextResponse.json(office);
});

const UpdateSchema = z.object({
  officeName:    z.string().min(2).max(200).optional(),
  officeType:    z.enum(["city", "municipal", "provincial"]).optional().nullable(),
  municipality:  z.string().min(2).max(100).optional(),
  province:      z.string().max(100).optional().nullable(),
  region:        z.string().min(2).max(100).optional(),
  zipCode:       z.string().max(10).optional().nullable(),
  contactEmail:  z.string().email().optional(),
  contactPhone:  z.string().max(30).optional().nullable(),
  contactMobile: z.string().max(30).optional().nullable(),
  address:       z.string().max(300).optional().nullable(),
  website:       z.string().max(200).url().or(z.literal("")).optional().nullable(),
  isActive:      z.boolean().optional(),
});

export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const updated = await pesoService.updateOfficeSettings(user.userId, parsed.data);
  return NextResponse.json(updated);
});
