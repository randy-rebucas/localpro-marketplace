import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { userRepository } from "@/repositories";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import type { UserDocument } from "@/models/User";

const DEFAULT_PREFS = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  messageNotifications: true,
  profileVisible: true,
  // provider-only
  newJobAlerts: true,
  quoteExpiryReminders: true,
  jobInviteAlerts: true,
  reviewAlerts: true,
  instantBooking: false,
  autoReadReceipt: false,
};

const PrefsSchema = z.object({
  emailNotifications:   z.boolean().optional(),
  pushNotifications:    z.boolean().optional(),
  smsNotifications:     z.boolean().optional(),
  marketingEmails:      z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  profileVisible:       z.boolean().optional(),
  newJobAlerts:         z.boolean().optional(),
  quoteExpiryReminders: z.boolean().optional(),
  jobInviteAlerts:      z.boolean().optional(),
  reviewAlerts:         z.boolean().optional(),
  instantBooking:       z.boolean().optional(),
  autoReadReceipt:      z.boolean().optional(),
});

export const GET = withHandler(async () => {
  const token = await requireUser();
  const rl = await checkRateLimit(`user:settings:get:${token.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const user = await userRepository.findById(token.userId);
  if (!user) throw new NotFoundError("User");

  const prefs = { ...DEFAULT_PREFS, ...((user as unknown as { preferences?: Partial<typeof DEFAULT_PREFS> }).preferences ?? {}) };
  return NextResponse.json({ preferences: prefs });
});

export const PUT = withHandler(async (req: NextRequest) => {
  const token = await requireUser();
  const rl = await checkRateLimit(`user:settings:put:${token.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const doc = await userRepository.getDocById(token.userId) as UserDocument | null;
  if (!doc) throw new NotFoundError("User");

  const current = { ...DEFAULT_PREFS, ...((doc as unknown as { preferences?: Partial<typeof DEFAULT_PREFS> }).preferences ?? {}) };
  const updated = { ...current, ...parsed.data };

  (doc as unknown as { preferences: typeof updated }).preferences = updated;
  doc.markModified("preferences");
  await doc.save();

  return NextResponse.json({ preferences: updated });
});
