import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { providerProfileRepository } from "@/repositories";
import { getProviderTier } from "@/lib/tier";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/ai/generate-quote-message */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { jobTitle, jobDescription, jobBudget, category } = await req.json();

  // Tier gate: Gold+ only
  const qProfile = await providerProfileRepository.findByUserId(user.userId) as {
    completedJobCount?: number;
    avgRating?: number;
    completionRate?: number;
  } | null;
  const quoteTier = getProviderTier(
    qProfile?.completedJobCount ?? 0,
    qProfile?.avgRating ?? 0,
    qProfile?.completionRate ?? 0
  );
  if (!quoteTier.hasAIAccess) {
    return NextResponse.json({
      error: `AI features require Gold tier or above. You're currently ${quoteTier.label}. ${quoteTier.nextMsg}.`,
      upgradeRequired: true,
      currentTier: quoteTier.tier,
      requiredTier: "gold",
    }, { status: 403 });
  }

  if (!jobTitle || typeof jobTitle !== "string" || jobTitle.trim().length < 3) {
    throw new ValidationError("A job title is required to generate a quote message.");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI quote generation is not available right now." }, { status: 503 });
  }

  const systemPrompt = `You are a quote writing assistant for a Filipino service provider on a local services marketplace called LocalPro.
Given a job posting, write a professional message a provider would send to a client with their quote.
Requirements:
- 3–5 sentences max
- Introduce themselves briefly, acknowledge the job specifics, and explain their approach
- Confident but not boastful tone
- No mention of specific prices (the provider sets that separately)
- Also suggest a realistic timeline (e.g. "2–3 hours", "half day", "1 day")
- Return ONLY a JSON object: {"message": "<quote message>", "timeline": "<timeline suggestion>"}
- No other text`;

  const userPrompt = [
    `Job title: ${jobTitle.trim()}`,
    category ? `Category: ${category}` : null,
    jobDescription ? `Description: ${String(jobDescription).slice(0, 400)}` : null,
    jobBudget ? `Client budget: ₱${jobBudget}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { message?: string; timeline?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned an invalid response." }, { status: 500 });
    }

    const message = parsed.message?.trim();
    const timeline = parsed.timeline?.trim();

    if (!message) {
      return NextResponse.json({ error: "AI returned an empty message." }, { status: 500 });
    }

    return NextResponse.json({ message, timeline: timeline ?? "" });
  } catch (err) {
    console.error("[OpenAI] generate-quote-message failed:", err);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
});
