/**
 * Escrow Management Agent
 * Automatically handles escrow release, splits, and commission calculations
 * POST /api/ai/agents/escrow-manager
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EscrowInput {
  jobId: string;
  jobAmount: number;
  jobStatus: "in_progress" | "completed" | "disputed";
  completedPercentage: number; // 0-100
  clientRating?: number; // 1-5
  providerRating?: number; // 1-5
  jobComments?: string;
  hasDispute: boolean;
  daysSinceCompletion: number;
  qualityIndicators?: {
    onTimeCompletion: boolean;
    clientSatisfaction: number; // 1-5
    noComplaints: boolean;
  };
}

interface EscrowDecision {
  action: "release_full" | "release_partial" | "hold" | "refund";
  releaseAmount: number;
  holdAmount: number;
  clientCommission: number; // Amount to charge client
  providerAmount: number;
  confidence: number; // 0-100
  reasons: string[];
  recommendedHandlingFee: number;
}

export async function POST(req: NextRequest) {
  try {
    const input: EscrowInput = await req.json();

    // Business rules for escrow
    const autoReleaseThreshold = 48; // hours
    const timePassedHours = input.daysSinceCompletion * 24;

    // Quick decision logic
    let quickDecision: EscrowDecision | null = null;

    if (input.hasDispute) {
      // Disputed jobs held until resolution
      quickDecision = {
        action: "hold",
        releaseAmount: 0,
        holdAmount: input.jobAmount,
        clientCommission: 0,
        providerAmount: 0,
        confidence: 100,
        reasons: ["Job has active dispute - held until resolution"],
        recommendedHandlingFee: 100,
      };
    } else if (
      input.jobStatus === "completed" &&
      timePassedHours >= autoReleaseThreshold &&
      input.completedPercentage >= 95
    ) {
      // Auto-release after 48 hours with no disputes
      const commission = input.jobAmount * 0.15; // 15% commission
      quickDecision = {
        action: "release_full",
        releaseAmount: input.jobAmount,
        holdAmount: 0,
        clientCommission: 0,
        providerAmount: input.jobAmount - commission,
        confidence: 95,
        reasons: [
          "48+ hours since completion",
          "No disputes filed",
          "Job 95%+ completed",
          "Auto-release triggered",
        ],
        recommendedHandlingFee: 0,
      };
    }

    // If quick decision applies, use it
    if (quickDecision) {
      return NextResponse.json({
        success: true,
        decision: quickDecision,
        isAutomatic: true,
      });
    }

    // Otherwise, use AI for complex cases
    const prompt = `You are an escrow management expert for a Philippine marketplace. Decide escrow release.

Job Amount: ₱${input.jobAmount}
Job Status: ${input.jobStatus}
Completion %: ${input.completedPercentage}%
Days Since Completion: ${input.daysSinceCompletion}
Has Dispute: ${input.hasDispute}
Client Rating: ${input.clientRating || "Not rated"}/5
Provider Rating: ${input.providerRating || "Not rated"}/5
Quality Indicators: ${input.qualityIndicators ? JSON.stringify(input.qualityIndicators) : "None"}

Escrow Release Rules:
1. Completed job, no dispute, 48+ hours → Auto-release
2. Partial completion (<95%) → Proportional release
3. Quality issues → Hold and investigate
4. Active dispute → Hold until resolution
5. Provider refund (client requested) → Full refund to client

Calculate:
- Release amount (to provider)
- Hold amount (if any)
- Commission (15% standard)
- Handling fee if needed

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an escrow expert. Make fair, rule-based decisions. Always return valid JSON. Total released = providerAmount. Client pays 15% commission.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Very strict
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const decision = JSON.parse(content) as EscrowDecision;

    // Validate amounts
    decision.releaseAmount = Math.min(decision.releaseAmount, input.jobAmount);
    decision.holdAmount = Math.max(0, input.jobAmount - decision.releaseAmount);
    decision.providerAmount = Math.min(decision.providerAmount, input.jobAmount * 0.85); // Max 85% after commission

    return NextResponse.json({
      success: true,
      decision,
      isAutomatic: false,
    });
  } catch (error) {
    console.error("[Escrow Manager] Error:", error);
    return NextResponse.json(
      { error: "Escrow management failed", details: String(error) },
      { status: 500 }
    );
  }
}
