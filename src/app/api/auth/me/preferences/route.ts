import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ValidationError, NotFoundError } from "@/lib/errors";

const EmailCategoriesSchema = z.object({
  jobUpdates:    z.boolean().optional(),
  quoteAlerts:   z.boolean().optional(),
  paymentAlerts: z.boolean().optional(),
  disputeAlerts: z.boolean().optional(),
  reminders:     z.boolean().optional(),
  messages:      z.boolean().optional(),
  consultations: z.boolean().optional(),
  reviews:       z.boolean().optional(),
});

const UpdatePreferencesSchema = z.object({
  emailNotifications:   z.boolean().optional(),
  pushNotifications:    z.boolean().optional(),
  smsNotifications:     z.boolean().optional(),
  marketingEmails:      z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  profileVisible:       z.boolean().optional(),
  emailCategories:      EmailCategoriesSchema.optional(),
  // Provider-only
  newJobAlerts:         z.boolean().optional(),
  quoteExpiryReminders: z.boolean().optional(),
  jobInviteAlerts:      z.boolean().optional(),
  reviewAlerts:         z.boolean().optional(),
  instantBooking:       z.boolean().optional(),
  autoReadReceipt:      z.boolean().optional(),
});

/**
 * PUT /api/auth/me/preferences
 *
 * Allows an authenticated user to update their notification and display preferences.
 * Supports partial updates — only the fields provided will be changed.
 */
export const PUT = withHandler(async (req: NextRequest) => {
  const tokenUser = await requireUser();
  const body = await req.json();
  const parsed = UpdatePreferencesSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const user = await userRepository.getDocByIdWithPassword(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  // Ensure preferences sub-document exists
  if (!user.preferences) {
    (user as unknown as { preferences: Record<string, unknown> }).preferences = {};
  }

  const prefs = user.preferences as unknown as Record<string, unknown>;
  const updates = parsed.data;

  // Apply top-level preference fields
  for (const [key, value] of Object.entries(updates)) {
    if (key === "emailCategories") continue; // handled separately below
    if (value !== undefined) {
      prefs[key] = value;
    }
  }

  // Merge emailCategories (partial update)
  if (updates.emailCategories) {
    const existing = (prefs.emailCategories ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(updates.emailCategories)) {
      if (value !== undefined) {
        existing[key] = value;
      }
    }
    prefs.emailCategories = existing;
  }

  user.markModified("preferences");
  await user.save();

  return NextResponse.json({ ok: true, preferences: user.preferences });
});

/**
 * GET /api/auth/me/preferences
 *
 * Returns the current user's preferences.
 */
export const GET = withHandler(async () => {
  const tokenUser = await requireUser();

  await connectDB();
  const user = await userRepository.findById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  return NextResponse.json({ preferences: user.preferences ?? {} });
});
