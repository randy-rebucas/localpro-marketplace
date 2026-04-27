import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

const EmergencySchema = z.object({
  jobType:       z.string().min(2).max(100),
  location:      z.string().min(2).max(200),
  urgency:       z.enum(["low", "medium", "high", "critical"]),
  workersNeeded: z.number().int().min(1).max(500),
  duration:      z.string().min(1).max(100),
  notes:         z.string().max(1000).optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-emergency:${user.userId}`, { windowMs: 3_600_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = EmergencySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const job = await pesoService.sendEmergencyBroadcast(user.userId, parsed.data);
  return NextResponse.json(job, { status: 201 });
});
