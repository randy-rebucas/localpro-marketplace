/**
 * Escrow Management Agent
 * Automatically handles escrow release, splits, and commission calculations
 * POST /api/ai/agents/escrow-manager
 * Internal endpoint — requires INTERNAL_API_KEY bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface EscrowInput {
  jobId: string;
  jobAmount: number;
  jobStatus: "in_progress" | "completed" | "disputed";
  completedPercentage: number;
  clientRating?: number;
  providerRating?: number;
  jobComments?: string;
  hasDispute: boolean;
  daysSinceCompletion: number;
  qualityIndicators?: {
    onTimeCompletion: boolean;
    clientSatisfaction: number;
    noComplaints: boolean;
  };
}

interface EscrowDecision {
  action: "release_full" | "release_partial" | "hold" | "refund";
  releaseAmount: number;
  holdAmount: number;
  clientCommission: number;
  providerAmount: number;
  confidence: number;
  reasons: string[];
  recommendedHandlingFee: number;
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

  const input: EscrowInput = await req.json();
  const timePassedHours = input.daysSinceCompletion * 24;

  // Quick decision: disputed jobs always held
  if (input.hasDispute) {
    return NextResponse.json({
      success: true,
      decision: {
        action: "hold",
        releaseAmount: 0,
        holdAmount: input.jobAmount,
        clientCommission: 0,
        providerAmount: 0,
        confidence: 100,
        reasons: ["Job has active dispute - held until resolution"],
        recommendedHandlingFee: 100,
      },
      isAutomatic: true,
    });
  }

  // Quick decision: auto-release after 48h with no disputes
  if (input.jobStatus === "completed" && timePassedHours >= 48 && input.completedPercentage >= 95) {
    const commission = input.jobAmount * 0.15;
    return NextResponse.json({
      success: true,
      decision: {
        action: "release_full",
        releaseAmount: input.jobAmount,
        holdAmount: 0,
        clientCommission: 0,
        providerAmount: input.jobAmount - commission,
        confidence: 95,
        reasons: ["48+ hours since completion", "No disputes filed", "Job 95%+ completed", "Auto-release triggered"],
        recommendedHandlingFee: 0,
      },
      isAutomatic: true,
    });
  }

  // AI decision for complex cases
  const prompt = `You are an escrow management expert for a Philippine marketplace. Decide escrow release.

Job Amount: ₱${input.jobAmount}
Job Status: ${input.jobStatus}
Completion %: ${input.completedPercentage}%
Days Since Completion: ${input.daysSinceCompletion}
Client Rating: ${input.clientRating || "Not rated"}/5
Provider Rating: ${input.providerRating || "Not rated"}/5
Quality Indicators: ${input.qualityIndicators ? JSON.stringify(input.qualityIndicators) : "None"}

Response format:
{
  "action": "release_full|release_partial|hold|refund",
  "releaseAmount": <amount>,
  "holdAmount": <amount>,
  "clientCommission": <amount>,
  "providerAmount": <amount>,
  "confidence": <0-100>,
  "reasons": [<list>],
  "recommendedHandlingFee": <amount>
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an escrow expert. Make fair, rule-based decisions. Always return valid JSON. Total released = providerAmount. Client pays 15% commission." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const decision = JSON.parse(content) as EscrowDecision;

  decision.releaseAmount = Math.min(decision.releaseAmount, input.jobAmount);
  decision.holdAmount = Math.max(0, input.jobAmount - decision.releaseAmount);
  decision.providerAmount = Math.min(decision.providerAmount, input.jobAmount * 0.85);

  return NextResponse.json({ success: true, decision, isAutomatic: false });
});
