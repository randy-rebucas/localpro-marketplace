import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { LOCALE_COOKIE, locales } from "@/i18n/config";
import { cookies } from "next/headers";

/**
 * PATCH /api/user/locale
 * Body: { locale: "en" | "tl" }
 *
 * Saves the user's preferred language to the database and sets the LOCALE
 * cookie so the UI reflects the change immediately on the next request.
 */
export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json() as { locale?: string };

  if (!body.locale || !(locales as readonly string[]).includes(body.locale)) {
    return NextResponse.json({ error: `locale must be one of: ${locales.join(", ")}` }, { status: 400 });
  }

  const locale = body.locale as "en" | "tl";

  await connectDB();
  await User.findByIdAndUpdate(user.userId, { preferredLocale: locale });

  // Set the cookie so the layout immediately picks up the new locale
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // readable by JS so LocaleSwitcher can sync
  });

  return NextResponse.json({ ok: true, locale });
});

/**
 * GET /api/user/locale
 * Returns the current user's preferred locale (from DB).
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  await connectDB();
  const doc = await User.findById(user.userId).select("preferredLocale").lean();
  const locale = (doc as { preferredLocale?: string } | null)?.preferredLocale ?? "en";
  return NextResponse.json({ locale });
});
