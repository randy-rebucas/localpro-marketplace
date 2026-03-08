import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";
import { ValidationError } from "@/lib/errors";

const CertSchema = z.object({
  title:    z.string().min(2).max(200),
  issuer:   z.string().min(2).max(200),
  issuedAt: z.string(),
  expiresAt: z.string().optional(),
});

export const POST = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { id: providerId } = await ctx.params;
  const parsed = CertSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const cert = await pesoService.addCertification(user.userId, providerId, {
    title:    parsed.data.title,
    issuer:   parsed.data.issuer,
    issuedAt: new Date(parsed.data.issuedAt),
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    verifiedByPeso: true,
  });

  return NextResponse.json(cert, { status: 201 });
});

export const DELETE = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { id: providerId } = await ctx.params;
  const { certId } = await req.json();
  if (!certId) throw new ValidationError("certId is required");

  const result = await pesoService.removeCertification(user.userId, providerId, certId);
  return NextResponse.json(result);
});
