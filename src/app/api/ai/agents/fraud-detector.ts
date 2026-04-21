/**
 * Fraud Detection Agent
 * Monitors transactions for fraud and suspicious patterns
 * POST /api/ai/agents/fraud-detector
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface FraudDetectionInput {
  transactionId: string;
  type: "withdrawal" | "booking" | "dispute_resolution" | "refund";
  amount: number;
  userId: string;
  userHistory: {
    totalTransactions: number;
    averageTransactionAmount: number;
    chargebackCount: number;
    disputeCount: number;
    accountAgeInDays: number;
    previousFraudFlags: number;
  };
  transactionDetails: {
    jobId?: string;
    paymentMethod?: string;
    destination?: string;
    timestamps?: {
      accountCreated: string;
      transactionTime: string;
    };
  };
}

interface FraudDecision {
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  fraudIndicators: string[];
  confidence: number; // 0-100
  shouldBlock: boolean;
  recommendedActions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const input: FraudDetectionInput = await req.json();

    // Quick checks before AI
    const quickFlags: string[] = [];
    if (input.amount > 500000) quickFlags.push("Very large withdrawal (₱500K+)");
    if (input.userHistory.chargebackCount > 2) quickFlags.push("Multiple chargebacks on record");
    if (input.userHistory.disputeCount > 5) quickFlags.push("Excessive disputes");
    if (input.userHistory.accountAgeInDays < 7) quickFlags.push("New account");
    if (input.amount > input.userHistory.averageTransactionAmount * 5) quickFlags.push("Amount 5x higher than average");
    if (input.userHistory.previousFraudFlags > 0) quickFlags.push("Previous fraud flags on account");

    const prompt = `You are a fraud detection expert for a Philippine marketplace. Analyze this transaction for fraud risk.

Transaction Type: ${input.type}
Amount: ₱${input.amount.toLocaleString()}
Account Age: ${input.userHistory.accountAgeInDays} days
Total Transactions: ${input.userHistory.totalTransactions}
Average Transaction: ₱${input.userHistory.averageTransactionAmount.toLocaleString()}
Chargebacks: ${input.userHistory.chargebackCount}
Disputes: ${input.userHistory.disputeCount}
Previous Fraud Flags: ${input.userHistory.previousFraudFlags}
Quick Flags: ${quickFlags.join("; ") || "None"}

Fraud Patterns to Check:
1. Unusual withdrawal patterns
2. Rapid account escalation (new + large transaction)
3. Chargeback/dispute history
4. Payment method mismatches
5. Timing anomalies

Respond with JSON:
{
  "riskScore": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "fraudIndicators": [<list>],
  "confidence": <0-100>,
  "shouldBlock": <true/false>,
  "recommendedActions": [<list>]
}

Critical Rules:
- If 2+ chargebacks AND amount > average: CRITICAL
- If account < 7 days AND amount > ₱100K: HIGH
- If risk score > 75: shouldBlock = true`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fraud detection expert. Err on the side of caution. Return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const decision = JSON.parse(content) as FraudDecision;

    // Apply quick flags to decision
    if (quickFlags.length > 0 && decision.riskScore < 60) {
      decision.riskScore = 65;
      decision.fraudIndicators = [...new Set([...decision.fraudIndicators, ...quickFlags])];
    }

    return NextResponse.json({
      success: true,
      decision: {
        riskScore: Math.min(100, decision.riskScore),
        riskLevel: decision.riskLevel,
        fraudIndicators: decision.fraudIndicators,
        confidence: decision.confidence,
        shouldBlock: decision.shouldBlock || decision.riskScore > 75,
        recommendedActions: decision.recommendedActions,
      },
    });
  } catch (error) {
    console.error("[Fraud Detector] Error:", error);
    return NextResponse.json(
      { error: "Fraud detection failed", details: String(error) },
      { status: 500 }
    );
  }
}
