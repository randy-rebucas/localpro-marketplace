/**
 * Booking Optimization Agent
 * Smart provider-to-job matching and quote recommendations
 * POST /api/ai/agents/booking-optimizer
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Provider {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  jobsCompleted: number;
  responseTime: number; // minutes
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

interface BookingRecommendation {
  topProviders: Array<{
    providerId: string;
    matchScore: number; // 0-100
    recommendedQuote: number;
    reasons: string[];
  }>;
  confidence: number; // 0-100
  estimatedAcceptanceTime: number; // minutes
  autoAcceptableIfRating: number; // ≥ this rating
}

export async function POST(req: NextRequest) {
  try {
    const input: {
      job: Job;
      availableProviders: Provider[];
    } = await req.json();

    // Pre-score providers
    const providerScores = input.availableProviders
      .map((provider) => {
        let score = 0;

        // Skill match
        const skillMatches = provider.skills.filter((s) =>
          input.job.skills.some((js) => js.toLowerCase().includes(s.toLowerCase()))
        ).length;
        score += Math.min(40, skillMatches * 10);

        // Rating
        score += Math.min(20, provider.rating * 2);

        // Response time
        if (provider.responseTime < 5) score += 15;
        else if (provider.responseTime < 30) score += 10;
        else if (provider.responseTime < 60) score += 5;

        // Availability
        if (provider.availability === "available") score += 15;
        else if (provider.availability === "busy") score += 5;

        // Distance
        if (provider.distanceKm && provider.distanceKm < 5) score += 10;
        else if (provider.distanceKm && provider.distanceKm < 15) score += 5;

        return { provider, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5

    const prompt = `You are a booking optimization expert. Rank providers for this job.

Job: ${input.job.title}
Budget: ₱${input.job.budget}
Urgency: ${input.job.urgency}
Skills Needed: ${input.job.skills.join(", ")}

Providers (pre-scored):
${providerScores
  .map(
    (ps) =>
      `- ${ps.provider.name} (Score: ${ps.score}/100, Rating: ${ps.provider.rating}/5, Jobs: ${ps.provider.jobsCompleted})`
  )
  .join("\n")}

Recommend top 3 providers with:
1. Match score (0-100)
2. Suggested quote within budget
3. Why they're recommended
4. Auto-accept rating threshold

Respond with JSON:
{
  "topProviders": [
    {
      "providerId": <id>,
      "matchScore": <0-100>,
      "recommendedQuote": <amount>,
      "reasons": [<list>]
    }
  ],
  "confidence": <0-100>,
  "estimatedAcceptanceTime": <minutes>,
  "autoAcceptableIfRating": <4.0-5.0>
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a booking optimization expert. Match providers to jobs intelligently. Return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const recommendation = JSON.parse(content) as BookingRecommendation;

    return NextResponse.json({
      success: true,
      recommendation: {
        topProviders: recommendation.topProviders.map((p) => ({
          ...p,
          providerId: providerScores[0].provider.id, // Map back to actual provider
        })),
        confidence: recommendation.confidence,
        estimatedAcceptanceTime: recommendation.estimatedAcceptanceTime,
        autoAcceptableIfRating: recommendation.autoAcceptableIfRating,
      },
    });
  } catch (error) {
    console.error("[Booking Optimizer] Error:", error);
    return NextResponse.json(
      { error: "Booking optimization failed", details: String(error) },
      { status: 500 }
    );
  }
}
