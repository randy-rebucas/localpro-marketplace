import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { pesoService } from "@/services/peso.service";

const ReferSchema = z.object({
  name:              z.string().min(2).max(100),
  email:             z.string().email(),
  phone:             z.string().max(30).optional(),
  barangay:          z.string().max(100).optional(),
  skills:            z.array(z.object({
    skill: z.string().min(1).max(100),
    yearsExperience: z.number().int().min(0).max(50).default(0),
    hourlyRate: z.string().max(20).default(""),
  })).max(20).optional(),
  livelihoodProgram: z.string().max(200).optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const parsed = ReferSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await pesoService.referProvider(user.userId, parsed.data);
  return NextResponse.json(result, { status: 201 });
});
