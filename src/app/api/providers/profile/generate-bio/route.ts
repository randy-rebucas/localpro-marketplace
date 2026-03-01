import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";
import User from "@/models/User";
import OpenAI from "openai";
import { getProviderTier } from "@/lib/tier";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/providers/profile/generate-bio */
export const POST = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "provider");

  await connectDB();

  const [profile, userDoc] = await Promise.all([
    ProviderProfile.findOne({ userId: user.userId }).lean(),
    User.findById(user.userId).select("addresses name").lean(),
  ]);

  // Tier gate: Gold+ only
  const profileTier = getProviderTier(
    (profile as { completedJobCount?: number } | null)?.completedJobCount ?? 0,
    (profile as { avgRating?: number } | null)?.avgRating ?? 0,
    (profile as { completionRate?: number } | null)?.completionRate ?? 0
  );
  if (!profileTier.hasAIAccess) {
    return NextResponse.json({
      error: `AI features require Gold tier or above. You're currently ${profileTier.label}. ${profileTier.nextMsg}.`,
      upgradeRequired: true,
      currentTier: profileTier.tier,
      requiredTier: "gold",
    }, { status: 403 });
  }

  const skills: string[]   = profile?.skills ?? [];
  const years: number      = profile?.yearsExperience ?? 0;
  const rate: number | null = profile?.hourlyRate ?? null;
  const serviceAreas        = (profile?.serviceAreas ?? []) as { label: string; address: string }[];
  const addresses           = (userDoc as unknown as { addresses?: { label: string; address: string; isDefault?: boolean }[] })?.addresses ?? [];

  // Build location context from service areas + default address
  const locationParts: string[] = [];
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  if (defaultAddr) locationParts.push(defaultAddr.address);
  serviceAreas.forEach((a) => {
    if (!locationParts.includes(a.address)) locationParts.push(a.label || a.address);
  });

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI bio generation is not available right now." }, { status: 503 });
  }

  const systemPrompt = `You are a professional profile-writing assistant for a Philippine local services marketplace called LocalPro.
Write a compelling first-person bio for a service provider.
Requirements:
- 3–5 sentences, 80–160 words
- Conversational but professional tone
- Highlight skills, experience, and service coverage
- Natural, not generic — avoid clichés like "passionate" or "dedicated"
- Do NOT include rates unless provided
- Output ONLY the bio text, no labels or extra commentary`;

  const userPrompt = [
    `Skills: ${skills.length ? skills.join(", ") : "not specified"}`,
    `Years of experience: ${years > 0 ? years : "not specified"}`,
    rate ? `Hourly rate: ₱${rate}` : null,
    locationParts.length ? `Service areas / location: ${locationParts.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 256,
    });

    const bio = response.choices[0]?.message?.content?.trim() ?? "";
    if (!bio) return NextResponse.json({ error: "AI returned an empty response." }, { status: 500 });

    return NextResponse.json({ bio });
  } catch (err) {
    console.error("[OpenAI] generate-bio failed:", err);
    return NextResponse.json({ error: "Failed to generate bio. Please try again." }, { status: 500 });
  }
});
