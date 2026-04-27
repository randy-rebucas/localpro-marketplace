import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import AgencyProfile from "@/models/AgencyProfile";

const SettingsSchema = z.object({
  maxConcurrentJobs:    z.number().int().min(1).max(200).optional(),
  autoAcceptQuotes:     z.boolean().optional(),
  operatingHours:       z.string().max(200).optional(),
  defaultWorkerSharePct: z.number().min(0).max(100).optional(),
});

async function requireProvider() {
  const u = await requireUser();
  if (u.role !== "provider") throw new ForbiddenError();
  return u;
}

/** GET /api/provider/agency/settings */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireProvider();

  const rl = await checkRateLimit(`agency-settings:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();
  const agency = await AgencyProfile.findOne(
    { providerId: user.userId },
    "name maxConcurrentJobs autoAcceptQuotes operatingHours serviceCategories serviceAreas defaultWorkerSharePct"
  ).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  // Apply defaults for fields added after initial agency creation
  const settings = {
    ...agency,
    maxConcurrentJobs:     agency.maxConcurrentJobs     ?? 10,
    autoAcceptQuotes:      agency.autoAcceptQuotes       ?? false,
    operatingHours:        agency.operatingHours         ?? "",
    defaultWorkerSharePct: agency.defaultWorkerSharePct  ?? 60,
  };

  return NextResponse.json({ settings });
});

/** PATCH /api/provider/agency/settings */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireProvider();
  const body = await req.json().catch(() => ({}));
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();
  const agency = await AgencyProfile.findOneAndUpdate(
    { providerId: user.userId },
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!agency) throw new NotFoundError("AgencyProfile");
  return NextResponse.json({ settings: agency });
});
