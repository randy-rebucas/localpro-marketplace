import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import NotificationPreference from "@/models/NotificationPreference";

const CHANNELS = ["email", "push", "in_app"] as const;
const CATEGORIES = ["job_updates", "messages", "payments", "reviews", "marketing", "system"] as const;

type Channel = (typeof CHANNELS)[number];
type Category = (typeof CATEGORIES)[number];

/** Seed default preferences (all enabled) for a user who has none yet. */
async function ensureDefaults(userId: string) {
  const docs: Array<{ userId: string; channel: Channel; category: Category; enabled: boolean }> = [];
  for (const channel of CHANNELS) {
    for (const category of CATEGORIES) {
      docs.push({ userId, channel, category, enabled: true });
    }
  }
  // insertMany with ordered:false — silently skips duplicates on concurrent calls
  await NotificationPreference.insertMany(docs, { ordered: false }).catch(() => {});
}

/** GET /api/notifications/preferences — return all preferences for the authenticated user. */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`notif-prefs-get:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();
  await ensureDefaults(user.userId);

  const preferences = await NotificationPreference.find({ userId: user.userId })
    .sort({ channel: 1, category: 1 })
    .lean();

  return NextResponse.json({ preferences });
});

/** PUT /api/notifications/preferences — update a single preference. */
export const PUT = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`notif-prefs-put:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const body = await req.json();
  const { channel, category, enabled } = body as {
    channel?: string;
    category?: string;
    enabled?: boolean;
  };

  if (!channel || !CHANNELS.includes(channel as Channel)) {
    return NextResponse.json(
      { error: `Invalid channel. Must be one of: ${CHANNELS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!category || !CATEGORIES.includes(category as Category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be a boolean" },
      { status: 400 }
    );
  }

  const preference = await NotificationPreference.findOneAndUpdate(
    { userId: user.userId, channel, category },
    { enabled },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json({ preference });
});
