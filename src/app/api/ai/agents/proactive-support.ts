/**
 * Proactive Support Agent
 * Prevents issues before they happen with AI recommendations
 * POST /api/ai/agents/proactive-support
 * Internal endpoint — requires INTERNAL_API_KEY bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface ProactiveSupportInput {
  jobId: string;
  jobData: {
    title: string;
    description: string;
    budget: number;
    category: string;
    urgency: "low" | "medium" | "high";
    estimatedDuration: string;
  };
  clientProfile: {
    firstTimeClient: boolean;
    previousJobs: number;
    averageRating: number;
  };
  providerProfile: {
    specialization: string[];
    experience: number;
    averageRating: number;
    completionRate: number;
  };
  riskFactors: {
    budgetMismatch: boolean;
    complexityHigh: boolean;
    urgencyHigh: boolean;
    clientConcerned: boolean;
  };
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

  const input: ProactiveSupportInput = await req.json();

  let quickRiskScore = 0;
  if (input.riskFactors.budgetMismatch) quickRiskScore += 25;
  if (input.riskFactors.complexityHigh) quickRiskScore += 25;
  if (input.riskFactors.urgencyHigh) quickRiskScore += 20;
  if (input.riskFactors.clientConcerned) quickRiskScore += 20;
  if (input.clientProfile.firstTimeClient && input.riskFactors.complexityHigh) quickRiskScore += 10;

  const prompt = `You are a proactive support specialist for a skilled trades marketplace. Identify risks and suggest prevention.

Job: ${input.jobData.title}
Budget: ₱${input.jobData.budget}
Urgency: ${input.jobData.urgency}
Duration: ${input.jobData.estimatedDuration}

Client: ${input.clientProfile.firstTimeClient ? "First-time" : "Experienced"} (${input.clientProfile.previousJobs} jobs, ${input.clientProfile.averageRating} rating)
Provider: ${input.providerProfile.specialization.join("/")} specialist, ${input.providerProfile.experience} years exp (${input.providerProfile.averageRating} rating)

Risk Factors: ${Object.entries(input.riskFactors).filter(([, v]) => v).map(([k]) => k).join(", ") || "None"}
Quick Risk Score: ${quickRiskScore}

Provide prevention tips:
{
  "riskLevel": "low|medium|high",
  "potentialIssues": ["<issue1>", "<issue2>"],
  "preventiveTips": {
    "forClient": ["<tip1>", "<tip2>"],
    "forProvider": ["<tip1>", "<tip2>"]
  },
  "escalationScore": <0-100>,
  "shouldNotify": <true/false>
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a proactive support expert. Identify risks early and suggest practical prevention. Return valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const recommendation = JSON.parse(content);

  if (quickRiskScore > 50 && recommendation.riskLevel === "low") {
    recommendation.riskLevel = "medium";
    recommendation.escalationScore = Math.max(recommendation.escalationScore, 60);
  }
  if (quickRiskScore > 70) {
    recommendation.riskLevel = "high";
    recommendation.escalationScore = Math.max(recommendation.escalationScore, 75);
    recommendation.shouldNotify = true;
  }

  return NextResponse.json({ success: true, recommendation });
});
