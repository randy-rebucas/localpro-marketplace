/**
 * Booking Optimization Agent
 * Smart provider-to-job matching and quote recommendations
 * POST /api/ai/agents/booking-optimizer
 * Internal endpoint — requires INTERNAL_API_KEY bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface Provider {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  jobsCompleted: number;
  responseTime: number;
  distanceKm?: number;
  hourlyRate: number;
  availability: "available" | "busy" | "offline";
}

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: number;
  location: string;
  urgency: "low" | "medium" | "high";
  clientPreferences?: string[];
}

export const POST = withHandler(async (req: NextRequest) => {
  const internalKey = process.env.INTERNAL_API_KEY;
  const auth = req.headers.get("authorization");
  if (!internalKey || auth !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const input: { job: Job; availableProviders: Provider[] } = await req.json();

  const providerScores = input.availableProviders
    .map((provider) => {
      let score = 0;
      const skillMatches = provider.skills.filter((s) =>
        input.job.skills.some((js) => js.toLowerCase().includes(s.toLowerCase()))
      ).length;
      score += Math.min(40, skillMatches * 10);
      score += Math.min(20, provider.rating * 2);
      if (provider.responseTime < 5) score += 15;
      else if (provider.responseTime < 30) score += 10;
      else if (provider.responseTime < 60) score += 5;
      if (provider.availability === "available") score += 15;
      else if (provider.availability === "busy") score += 5;
      if (provider.distanceKm && provider.distanceKm < 5) score += 10;
      else if (provider.distanceKm && provider.distanceKm < 15) score += 5;
      return { provider, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const prompt = `You are a booking optimization expert. Rank providers for this job.

Job: ${input.job.title}
Budget: ₱${input.job.budget}
Urgency: ${input.job.urgency}
Skills Needed: ${input.job.skills.join(", ")}

Providers (pre-scored):
${providerScores.map((ps) => `- ${ps.provider.name} (Score: ${ps.score}/100, Rating: ${ps.provider.rating}/5, Jobs: ${ps.provider.jobsCompleted})`).join("\n")}

Recommend top 3 providers with match score, suggested quote, and reasons.

Respond with JSON:
{
  "topProviders": [
    { "providerId": <id>, "matchScore": <0-100>, "recommendedQuote": <amount>, "reasons": [<list>] }
  ],
  "confidence": <0-100>,
  "estimatedAcceptanceTime": <minutes>,
  "autoAcceptableIfRating": <4.0-5.0>
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a booking optimization expert. Match providers to jobs intelligently. Return valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const recommendation = JSON.parse(content);

  return NextResponse.json({
    success: true,
    recommendation: {
      topProviders: recommendation.topProviders?.map((p: { matchScore: number; recommendedQuote: number; reasons: string[] }, i: number) => ({
        ...p,
        providerId: providerScores[i]?.provider.id ?? providerScores[0].provider.id,
      })) ?? [],
      confidence: recommendation.confidence,
      estimatedAcceptanceTime: recommendation.estimatedAcceptanceTime,
      autoAcceptableIfRating: recommendation.autoAcceptableIfRating,
    },
  });
});
