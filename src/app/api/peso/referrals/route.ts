import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";
import { SkillEntrySchema } from "@/lib/validation";

const ReferSchema = z.object({
  name:              z.string().min(2).max(100),
  email:             z.string().email(),
  phone:             z.string().max(30).optional(),
  barangay:          z.string().max(100).optional(),
  skills:            z.array(SkillEntrySchema).max(20).optional(),
  livelihoodProgram: z.string().max(200).optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-referrals:${user.userId}`, { windowMs: 3_600_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = ReferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await pesoService.referProvider(user.userId, parsed.data);
  return NextResponse.json(result, { status: 201 });
});
