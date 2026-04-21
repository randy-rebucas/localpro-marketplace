import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { userRepository, notificationRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";
import { AIDecisionService } from "@/services/ai-decision.service";
import { connectDB } from "@/lib/db";

/** Cloudinary-only URL pattern for uploaded KYC documents */
const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\//;

const SubmitKycSchema = z.object({
  documents: z.array(
    z.object({
      type: z.enum(["government_id", "tesda_certificate", "business_permit", "selfie_with_id", "other"]),
      url: z
        .string()
        .url("Invalid document URL")
        .refine((u) => CLOUDINARY_URL_RE.test(u), "Document URL must be a Cloudinary URL"),
    })
  ).min(1, "At least one document is required"),
});

/** POST /api/kyc — authenticated user submits KYC documents */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const body = await req.json();
  const parsed = SubmitKycSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const documents = parsed.data.documents.map((d) => ({
    ...d,
    uploadedAt: new Date(),
  }));

  const updatedUser = await userRepository.submitKyc(user.userId, documents);

  // Notify all admins and staff about the new KYC submission (fire-and-forget)
  (async () => {
    try {
      const staffList = await userRepository.findAdminsAndStaff();
      await Promise.all(
        staffList.map(async (admin) => {
          const adminId = admin._id.toString();
          const note = await notificationRepository.create({
            userId: adminId,
            type: "kyc_submitted",
            title: "New KYC Submission",
            message: `${updatedUser?.name ?? "A user"} has submitted identity documents for review.`,
            data: { submittedBy: user.userId },
          });
          pushNotification(adminId, note);
        })
      );
    } catch (err) {
      console.error("[KYC] Failed to notify admins:", err);
    }
  })();

  // ── AI Analysis (non-blocking, fire-and-forget) ─────────────────────────
  // Call KYC Verifier agent to auto-verify if confidence is high
  (async () => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${appUrl}/api/ai/agents/kyc-verifier`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
        body: JSON.stringify({
          providerId: user.userId,
          documents: {
            idDocument: documents.find((d) => d.type === "government_id")?.url,
            licenseDocument: documents.find((d) => d.type === "tesda_certificate")?.url,
            certifications: documents
              .filter((d) => ["tesda_certificate", "business_permit"].includes(d.type))
              .map((d) => d.url),
          },
          userData: {
            name: (updatedUser as any)?.name || (updatedUser as any)?.email,
            phone: (updatedUser as any)?.phone,
            email: (updatedUser as any)?.email,
            yearsInBusiness: (updatedUser as any)?.yearsInBusiness || 0,
            previousJobs: (updatedUser as any)?.jobsCompleted || 0,
          },
        }),
      });

      if (!response.ok) {
        console.error("[KYC] AI agent request failed:", response.status);
        return;
      }

      const aiResult = await response.json();
      const decision = aiResult.decision;

      // If AI auto-approved with high confidence: approve immediately
      if (decision.shouldAutoApprove) {
        // Update user KYC status directly via database
        await userRepository.getDocById(user.userId).then(async (doc) => {
          if (doc) {
            (doc as any).kycStatus = "approved";
            (doc as any).isVerified = true;
            (doc as any).kycRejectionReason = null;
            await doc.save();
          }
        });

        const approverNote = await notificationRepository.create({
          userId: user.userId,
          type: "kyc_approved",
          title: "KYC Approved",
          message: "Your identity documents have been verified by our automated system.",
          data: {},
        });
        pushNotification(user.userId, approverNote);

        // Record successful AI decision
        await AIDecisionService.createDecision({
          type: "VALIDATION",
          agentName: "support_agent", // Using existing agent name
          confidenceScore: decision.confidence,
          riskLevel: decision.riskLevel,
          recommendation: `KYC verified with credibility score ${decision.credibilityScore}`,
          supportingEvidence: {
            behavioralFlags: decision.reasons,
          },
          relatedEntityType: "job",
          relatedEntityId: user.userId as any,
        });

        console.log("[KYC] Auto-approved by AI for user:", user.userId);
        return;
      }

      // Otherwise: queue for founder review
      const aiDecision = await AIDecisionService.createDecision({
        type: "VALIDATION",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: decision.riskLevel,
        recommendation: `KYC Review Required: ${decision.reasons?.join(", ") || "Manual review needed"}`,
        supportingEvidence: {
          behavioralFlags: decision.reasons,
        },
        relatedEntityType: "job",
        relatedEntityId: user.userId as any,
      });

      console.log("[KYC] Queued for founder review:", aiDecision._id);
    } catch (error) {
      console.error("[KYC] AI analysis error (non-blocking):", error);
      // Silently fail - KYC submission already recorded
    }
  })();

  return NextResponse.json({ message: "KYC documents submitted for review" });
});

/** GET /api/kyc — get own KYC status */
export const GET = withHandler(async () => {
  const user = await requireUser();

  const u = await userRepository.getKycStatus(user.userId);

  return NextResponse.json({
    kycStatus: u?.kycStatus ?? "none",
    kycDocuments: u?.kycDocuments ?? [],
    kycRejectionReason: u?.kycRejectionReason ?? null,
  });
});
