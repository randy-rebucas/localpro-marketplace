import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

const VerifySchema = z.object({
  tags: z.array(z.enum(["peso_registered", "lgu_resident", "peso_recommended"])).min(0),
});

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-verify:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  assertObjectId(id, "providerId");

  const parsed = VerifySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const updated = await pesoService.verifyProvider(user.userId, id, parsed.data.tags);
  return NextResponse.json(updated);
});
