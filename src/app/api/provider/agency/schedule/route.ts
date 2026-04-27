import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";

const SlotSchema = z.object({
  day:       z.number().int().min(0).max(6),
  open:      z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
});

const UpdateSchema = z.object({
  availability: z.array(SlotSchema).length(7),
});

async function requireProvider() {
  const u = await requireUser();
  if (u.role !== "provider") throw new ForbiddenError();
  return u;
}

const DEFAULTS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: day >= 1 && day <= 5,
  startTime: "08:00",
  endTime: "17:00",
}));

/** GET /api/provider/agency/schedule */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireProvider();

  const rl = await checkRateLimit(`agency-schedule:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();
  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();

  // New accounts: return defaults instead of throwing
  if (!agency || !agency.availability?.length) {
    return NextResponse.json({ availability: DEFAULTS });
  }

  const merged = DEFAULTS.map((def) => {
    const found = agency.availability.find((s) => s.day === def.day);
    return found ?? def;
  });

  return NextResponse.json({ availability: merged });
});

/** PATCH /api/provider/agency/schedule — save full 7-day availability */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  // Extra validation: endTime must be after startTime for open days
  for (const slot of parsed.data.availability) {
    if (!slot.open) continue;
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      throw new ValidationError(`End time must be after start time (day ${slot.day}).`);
    }
  }

  await connectDB();
  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: user.userId },
    {
      $set: { availability: parsed.data.availability },
      $setOnInsert: { name: "My Agency" },
    },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json({ availability: agency.availability });
});
