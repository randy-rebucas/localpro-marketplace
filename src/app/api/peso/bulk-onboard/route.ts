import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

const RowSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  phone:    z.string().max(30).optional(),
  skills:   z.string().optional(),   // comma-separated
  barangay: z.string().max(100).optional(),
});

const BulkSchema = z.array(RowSchema).min(1).max(200);

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-bulk:${user.userId}`, { windowMs: 3_600_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = BulkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const results = await pesoService.bulkOnboard(user.userId, parsed.data);
  return NextResponse.json({ results });
});
