import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { pesoService } from "@/services/peso.service";

const VerifySchema = z.object({
  tags: z.array(z.enum(["peso_registered", "lgu_resident", "peso_recommended"])).min(0),
});

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { id } = await ctx.params;

  const parsed = VerifySchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const updated = await pesoService.verifyProvider(user.userId, id, parsed.data.tags);
  return NextResponse.json(updated);
});
