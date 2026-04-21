/**
 * KYC Analysis Handler
 * Receives KYC submission and runs AI verification
 * POST /api/admin/kyc/analyze
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { userRepository } from "@/repositories";
import { AIDecisionService } from "@/services/ai-decision.service";
import { connectDB } from "@/lib/db";

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_kyc");

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    throw new ValidationError("userId is required");
  }

  assertObjectId(userId, "userId");

  const user = await userRepository.getDocById(userId);
  if (!user) throw new NotFoundError("User");

  // Get documents from user profile
  const userData = user as any;
  const documents = userData.kycDocuments || [];

  if (documents.length === 0) {
    throw new ValidationError("No KYC documents to analyze");
  }

  try {
    // Call KYC Verifier AI agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${appUrl}/api/ai/agents/kyc-verifier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
      },
      body: JSON.stringify({
        providerId: userId,
        documents: {
          idDocument: documents.find((d: any) => d.type === "id")?.url,
          licenseDocument: documents.find((d: any) => d.type === "license")?.url,
          certifications: documents
            .filter((d: any) => d.type === "certification")
            .map((d: any) => d.url),
        },
        userData: {
          name: userData.name || userData.email,
          phone: userData.phone,
          email: userData.email,
          yearsInBusiness: userData.yearsInBusiness,
          previousJobs: userData.jobsCompleted || 0,
        },
      }),
    });

    if (!response.ok) {
      console.error("[KYC Handler] AI agent failed:", response.status);
      throw new Error("KYC verification service failed");
    }

    const aiResult = await response.json();
    const decision = aiResult.decision;

    // If AI auto-approved with high confidence: approve immediately
    if (decision.shouldAutoApprove) {
      userData.kycStatus = "approved";
      userData.isVerified = true;
      userData.kycRejectionReason = null;
      await userData.save();

      // Record successful AI decision
      await AIDecisionService.createDecision({
        type: "VALIDATION",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: decision.riskLevel,
        recommendation: "KYC documents approved",
        supportingEvidence: {
          fraudScore: 100 - (decision.credibilityScore || 0),
          patternDetected: "Documents verified successfully",
        },
        relatedEntityType: "ticket",
        relatedEntityId: userId as any,
      });

      return NextResponse.json({
        success: true,
        message: "KYC auto-approved by AI",
        decision: {
          status: "approved",
          confidence: decision.confidence,
          credibilityScore: decision.credibilityScore,
        },
      });
    }

    // Otherwise: queue for founder review
    const aiDecision = await AIDecisionService.createDecision({
      type: "VALIDATION",
      agentName: "support_agent",
      confidenceScore: decision.confidence,
      riskLevel: decision.riskLevel,
      recommendation: "KYC requires manual review",
      supportingEvidence: {
        fraudScore: 100 - (decision.credibilityScore || 0),
        patternDetected: "Requires manual review",
      },
      relatedEntityType: "ticket",
      relatedEntityId: userId as any,
    });

    return NextResponse.json({
      success: true,
      message: "KYC analysis queued for founder review",
      decision: {
        status: "pending_review",
        confidence: decision.confidence,
        credibilityScore: decision.credibilityScore,
        aiDecisionId: aiDecision._id,
      },
    });
  } catch (error) {
    console.error("[KYC Handler] Error:", error);
    throw new Error(`KYC analysis failed: ${String(error)}`);
  }
});
