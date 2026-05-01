import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { userRepository, providerProfileRepository } from "@/repositories";
import { notificationService } from "@/services";
import { AIDecisionService } from "@/services/ai-decision.service";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  buildVerificationChecklist,
  KYC_UPLOAD_DOCUMENT_TYPES,
  type KycVerificationSnapshot,
} from "@/lib/provider-verification-checklist";

/** Cloudinary-only URL pattern for uploaded KYC documents */
const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\//;

const kycDocTypeEnum = z.enum(KYC_UPLOAD_DOCUMENT_TYPES);

const SubmitKycSchema = z.object({
  documents: z.array(
    z.object({
      type: kycDocTypeEnum,
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
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`kyc-post:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

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
        staffList.map((admin) =>
          notificationService.push({
            userId: admin._id.toString(),
            type: "kyc_submitted",
            title: "New KYC Submission",
            message: `${updatedUser?.name ?? "A user"} has submitted identity documents for review.`,
            data: { page: "kyc" },
          })
        )
      );
    } catch (err) {
      console.error("[KYC] Failed to notify admins:", err);
    }
  })();

  // ── AI Analysis (non-blocking, fire-and-forget) ─────────────────────────
  // Skip if INTERNAL_API_KEY is not configured — don't call with empty auth
  const internalKey = process.env.INTERNAL_API_KEY;
  if (internalKey) {
    (async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const response = await fetch(`${appUrl}/api/ai/agents/kyc-verifier`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${internalKey}`,
          },
          body: JSON.stringify({
            providerId: user.userId,
            documents: {
              idDocument: documents.find((d) => d.type === "government_id")?.url,
              licenseDocument: documents.find((d) => d.type === "tesda_certificate")?.url,
              certifications: documents
                .filter((d) =>
                  ["tesda_certificate", "training_certificate", "business_permit", "certification", "bir_registration"].includes(
                    d.type
                  )
                )
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
          await userRepository.updateById(user.userId, {
            kycStatus: "approved",
            isVerified: true,
            kycRejectionReason: null,
          });

          await notificationService.push({
            userId: user.userId,
            type: "kyc_approved",
            title: "KYC Approved",
            message: "Your identity documents have been verified by our automated system.",
            data: {},
          });

          await AIDecisionService.createDecision({
            type: "VALIDATION",
            agentName: "support_agent",
            confidenceScore: decision.confidence,
            riskLevel: decision.riskLevel,
            recommendation: `KYC verified with credibility score ${decision.credibilityScore}`,
            supportingEvidence: { behavioralFlags: decision.reasons },
            relatedEntityType: "user",
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
          supportingEvidence: { behavioralFlags: decision.reasons },
          relatedEntityType: "user",
          relatedEntityId: user.userId as any,
        });

        console.log("[KYC] Queued for founder review:", aiDecision._id);
      } catch (error) {
        console.error("[KYC] AI analysis error (non-blocking):", error);
      }
    })();
  }

  return NextResponse.json({ message: "KYC documents submitted for review" });
});

/** GET /api/kyc — get own KYC status */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`kyc-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const u = await userRepository.getKycStatus(user.userId);

  const kycDocuments = (u?.kycDocuments ?? []) as KycVerificationSnapshot["kycDocuments"];
  const accountType =
    u?.accountType === "business" ? "business" : "personal";

  let profileCertificationsCount = 0;
  const profile = await providerProfileRepository.findByUserId(user.userId);
  if (profile?.certifications?.length) profileCertificationsCount = profile.certifications.length;

  const snapshot: KycVerificationSnapshot = {
    kycStatus: (u?.kycStatus ?? "none") as KycVerificationSnapshot["kycStatus"],
    kycDocuments,
    accountType,
    profileCertificationsCount,
    kycRejectionReason: u?.kycRejectionReason ?? null,
  };

  return NextResponse.json({
    kycStatus: snapshot.kycStatus,
    kycDocuments,
    kycRejectionReason: snapshot.kycRejectionReason,
    accountType,
    checklist: buildVerificationChecklist(snapshot),
  });
});
