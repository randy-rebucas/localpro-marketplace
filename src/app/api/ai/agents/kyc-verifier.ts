/**
 * KYC Compliance Agent
 * Automatically verifies provider credentials & background
 * POST /api/ai/agents/kyc-verifier
 * Internal endpoint — requires INTERNAL_API_KEY bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface KYCInput {
  providerId: string;
  documents: {
    idDocument?: string;
    licenseDocument?: string;
    certifications?: string[];
  };
  userData: {
    name: string;
    phone: string;
    email: string;
    yearsInBusiness?: number;
    previousJobs?: number;
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

  const input: KYCInput = await req.json();

  const prompt = `You are a KYC (Know Your Customer) compliance expert for a Philippine skilled trades marketplace.
Analyze the following provider information and verify credentials:

Provider Name: ${input.userData.name}
Years in Business: ${input.userData.yearsInBusiness || "Unknown"}
Previous Jobs: ${input.userData.previousJobs || 0}
ID Document Status: ${input.documents.idDocument ? "Submitted" : "Missing"}
License Document: ${input.documents.licenseDocument ? "Submitted" : "Missing"}
Certifications: ${input.documents.certifications?.length || 0}

Fraud Indicators to Check:
1. Suspicious patterns (new account + high activity)
2. Mismatched information
3. Missing required documents
4. Credential inconsistencies

Provide a JSON response:
{
  "status": "approved|pending_review|rejected",
  "confidence": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "credibilityScore": <0-100>,
  "reasons": [<list of findings>],
  "recommendedActions": [<list of actions>]
}

Rules for auto-approval:
- Confidence >= 90%
- Risk level = "low"
- Credibility score >= 85
- All required documents present`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a compliance expert. Always return valid JSON. Be strict but fair with KYC verification." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const decision = JSON.parse(content);

  return NextResponse.json({
    success: true,
    decision: {
      status: decision.status,
      confidence: decision.confidence,
      riskLevel: decision.riskLevel,
      credibilityScore: decision.credibilityScore,
      reasons: decision.reasons,
      recommendedActions: decision.recommendedActions,
      shouldAutoApprove: decision.confidence >= 90 && decision.riskLevel === "low" && decision.credibilityScore >= 85,
    },
  });
});
