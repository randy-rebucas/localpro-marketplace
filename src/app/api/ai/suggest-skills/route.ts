import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";
import { getProviderTier } from "@/lib/tier";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/ai/suggest-skills */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { bio, category, existingSkills } = await req.json();

  // Tier gate: Gold+ only
  await connectDB();
  const pProfile = await ProviderProfile.findOne({ userId: user.userId })
    .select("completedJobCount avgRating completionRate").lean();
  const skillTier = getProviderTier(
    (pProfile as { completedJobCount?: number } | null)?.completedJobCount ?? 0,
    (pProfile as { avgRating?: number } | null)?.avgRating ?? 0,
    (pProfile as { completionRate?: number } | null)?.completionRate ?? 0
  );
  if (!skillTier.hasAIAccess) {
    return NextResponse.json({
      error: `AI features require Gold tier or above. You're currently ${skillTier.label}. ${skillTier.nextMsg}.`,
      upgradeRequired: true,
      currentTier: skillTier.tier,
      requiredTier: "gold",
    }, { status: 403 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI skill suggestions are not available right now." }, { status: 503 });
  }

  if (!bio && !category) {
    throw new ValidationError("Provide at least a bio or a category to generate skill suggestions.");
  }

  const systemPrompt = `You are a skills advisor for a Philippine local services marketplace called LocalPro.
Given a provider's bio and/or service category, suggest relevant professional skills they should add to their profile.
Requirements:
- Return 5–10 specific, searchable skill tags
- Skills should be concise (1–4 words each)
- Avoid duplicates with existing skills
- Focus on practical, in-demand service skills for the Philippine market
- Return ONLY a JSON array of strings: ["skill1", "skill2", ...]
- No explanations, no extra text`;

  const existing = Array.isArray(existingSkills) ? existingSkills : [];
  const userPrompt = [
    category ? `Service category: ${category}` : null,
    bio ? `Bio: ${String(bio).slice(0, 400)}` : null,
    existing.length > 0 ? `Already has skills: ${existing.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    // Strip markdown code fences if present
    const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    let skills: string[] = [];
    try {
      const parsed = JSON.parse(clean);
      skills = Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
    } catch {
      // Try to extract array portion (strip any surrounding text)
      const bracketStart = clean.indexOf("[");
      const bracketEnd = clean.lastIndexOf("]");
      if (bracketStart !== -1 && bracketEnd > bracketStart) {
        try { skills = JSON.parse(clean.slice(bracketStart, bracketEnd + 1)); } catch { skills = []; }
      }
    }

    if (skills.length === 0) {
      return NextResponse.json({ error: "AI returned no skill suggestions. Try adding more details to your bio." }, { status: 500 });
    }

    return NextResponse.json({ skills });
  } catch (err) {
    console.error("[OpenAI] suggest-skills failed:", err);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
});
