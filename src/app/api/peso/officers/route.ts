import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-officers:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

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

  const rl = await checkRateLimit(`peso-officer-add:${user.userId}`, { windowMs: 3_600_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = AddOfficerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const result = await pesoService.addOfficer(user.userId, parsed.data);
  return NextResponse.json(result, { status: 201 });
});
