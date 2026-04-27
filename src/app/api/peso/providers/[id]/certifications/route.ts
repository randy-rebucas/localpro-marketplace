import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

const OID_RE = /^[a-f\d]{24}$/i;

const CertSchema = z.object({
  title:    z.string().min(2).max(200),
  issuer:   z.string().min(2).max(200),
  issuedAt: z.string(),
  expiresAt: z.string().optional(),
});

export const POST = withHandler(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-certs:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id: providerId } = await ctx.params;
  assertObjectId(providerId, "providerId");

  const parsed = CertSchema.safeParse(await req.json().catch(() => ({})));
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
  assertObjectId(providerId, "providerId");

  const body = await req.json().catch(() => ({})) as { certId?: string };
  const { certId } = body;
  if (!certId) throw new ValidationError("certId is required");
  if (!OID_RE.test(certId)) throw new ValidationError("Invalid certId.");

  const result = await pesoService.removeCertification(user.userId, providerId, certId);
  return NextResponse.json(result);
});
