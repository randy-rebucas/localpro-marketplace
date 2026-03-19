/**
 * /api/cron/drip-emails
 *
 * Sends onboarding drip emails:
 *   - Day 3 "Post your first job" (clients)/  "Complete your profile" (providers)
 *   - Day 7 "Jobs near you" re-engagement
 *
 * Schedule: run daily via Vercel Cron.
 * Add to vercel.json:
 *   { "path": "/api/cron/drip-emails", "schedule": "0 9 * * *" }
 */

import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Job from "@/models/Job";
import {
  sendDripDay3ClientEmail,
  sendDripDay3ProviderEmail,
  sendDripDay7ClientEmail,
  sendDripDay7ProviderEmail,
} from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1_000;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = Date.now();
  const day3Start = new Date(now - 4 * DAY_MS); // 3–4 days ago window
  const day3End   = new Date(now - 3 * DAY_MS);
  const day7Start = new Date(now - 8 * DAY_MS); // 7–8 days ago window
  const day7End   = new Date(now - 7 * DAY_MS);

  // ── Day 3: clients who haven't posted a job yet ────────────────────────────
  const day3Clients = await User.find({
    role: "client",
    isDeleted: { $ne: true },
    isSuspended: { $ne: true },
    email: { $exists: true, $ne: null },
    "preferences.marketingEmails": { $ne: false },
    createdAt: { $gte: day3Start, $lte: day3End },
  })
    .select("_id name email")
    .limit(500)
    .lean();

  let day3ClientCount = 0;
  for (const client of day3Clients) {
    if (!client.email) continue;
    // Check they haven't posted any job yet
    const hasJob = await Job.exists({ clientId: client._id });
    if (hasJob) continue;
    await sendDripDay3ClientEmail(client.email, client.name ?? "there", String(client._id));
    day3ClientCount++;
  }

  // ── Day 3: providers who haven't completed profile (no skills) ─────────────
  const { default: ProviderProfile } = await import("@/models/ProviderProfile");
  const day3Providers = await User.find({
    role: "provider",
    isDeleted: { $ne: true },
    email: { $exists: true, $ne: null },
    "preferences.marketingEmails": { $ne: false },
    createdAt: { $gte: day3Start, $lte: day3End },
  })
    .select("_id name email")
    .limit(500)
    .lean();

  let day3ProviderCount = 0;
  for (const provider of day3Providers) {
    if (!provider.email) continue;
    const profile = await ProviderProfile.findOne({ userId: provider._id })
      .select("skills")
      .lean();
    if (profile && (profile as { skills?: unknown[] }).skills?.length) continue;
    await sendDripDay3ProviderEmail(provider.email, provider.name ?? "there", String(provider._id));
    day3ProviderCount++;
  }

  // ── Day 7: re-engagement for inactive clients ──────────────────────────────
  const openJobCount = await Job.countDocuments({ status: "open" });

  const day7Clients = await User.find({
    role: "client",
    isDeleted: { $ne: true },
    email: { $exists: true, $ne: null },
    "preferences.marketingEmails": { $ne: false },
    createdAt: { $gte: day7Start, $lte: day7End },
  })
    .select("_id name email")
    .limit(500)
    .lean();

  let day7ClientCount = 0;
  for (const client of day7Clients) {
    if (!client.email) continue;
    const jobCount = await Job.countDocuments({ clientId: client._id });
    if (jobCount > 0) continue; // already active
    await sendDripDay7ClientEmail(client.email, client.name ?? "there", openJobCount, "your area", String(client._id));
    day7ClientCount++;
  }

  // ── Day 7: re-engagement for providers who haven't submitted a quote ───────
  const day7Providers = await User.find({
    role: "provider",
    isDeleted: { $ne: true },
    email: { $exists: true, $ne: null },
    "preferences.marketingEmails": { $ne: false },
    createdAt: { $gte: day7Start, $lte: day7End },
  })
    .select("_id name email")
    .limit(500)
    .lean();

  const { default: Quote } = await import("@/models/Quote");
  let day7ProviderCount = 0;
  for (const provider of day7Providers) {
    if (!provider.email) continue;
    const hasQuote = await Quote.exists({ providerId: provider._id });
    if (hasQuote) continue;
    await sendDripDay7ProviderEmail(provider.email, provider.name ?? "there", openJobCount, String(provider._id));
    day7ProviderCount++;
  }

  return Response.json({
    ok: true,
    day3Clients: day3ClientCount,
    day3Providers: day3ProviderCount,
    day7Clients: day7ClientCount,
    day7Providers: day7ProviderCount,
  });
}
