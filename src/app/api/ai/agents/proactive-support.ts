/**
 * Proactive Support Agent
 * Prevents issues before they happen with AI recommendations
 * POST /api/ai/agents/proactive-support
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProactiveSupportInput {
  jobId: string;
  jobData: {
    title: string;
    description: string;
    budget: number;
    category: string;
    urgency: "low" | "medium" | "high";
    estimatedDuration: string; // e.g., "2 hours", "1 day"
  };
  clientProfile: {
    firstTimeClient: boolean;
    previousJobs: number;
    averageRating: number;
  };
  providerProfile: {
    specialization: string[];
    experience: number; // years
    averageRating: number;
    completionRate: number; // 0-100
  };
  riskFactors: {
    budgetMismatch: boolean;
    complexityHigh: boolean;
    urgencyHigh: boolean;
    clientConcerned: boolean;
  };
}

interface ProactiveRecommendation {
  riskLevel: "low" | "medium" | "high";
  confidence: number; // 0-100
  potentialIssues: string[];
  preventiveTips: {
    forClient: string[];
    forProvider: string[];
  };
  escalationScore: number; // 0-100, if >70 send proactive support
  shouldNotify: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const input: ProactiveSupportInput = await req.json();

    // Quick risk assessment
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

Risk Factors: ${Object.entries(input.riskFactors)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "None"}

Quick Risk Score: ${quickRiskScore}

Common Issues for Similar Jobs:
1. Scope creep (client wants more than quoted)
2. Miscommunication on quality standards
3. Budget overruns due to unforeseen issues
4. Scheduling conflicts
5. Material/supply delays

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
}

If escalationScore > 70, shouldNotify = true (send proactive support tip)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a proactive support expert. Identify risks early and suggest practical prevention. Return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const recommendation = JSON.parse(content) as ProactiveRecommendation;

    // Adjust based on quick risk score
    if (quickRiskScore > 50 && recommendation.riskLevel === "low") {
      recommendation.riskLevel = "medium";
      recommendation.escalationScore = Math.max(recommendation.escalationScore, 60);
    }
    if (quickRiskScore > 70) {
      recommendation.riskLevel = "high";
      recommendation.escalationScore = Math.max(recommendation.escalationScore, 75);
      recommendation.shouldNotify = true;
    }

    return NextResponse.json({
      success: true,
      recommendation,
    });
  } catch (error) {
    console.error("[Proactive Support] Error:", error);
    return NextResponse.json(
      { error: "Proactive support analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
