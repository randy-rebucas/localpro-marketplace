import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";
import { ValidationError } from "@/lib/errors";

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

  const parsed = EmergencySchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const job = await pesoService.sendEmergencyBroadcast(user.userId, parsed.data);
  return NextResponse.json(job, { status: 201 });
});
