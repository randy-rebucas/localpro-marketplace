/**
 * Derives provider verification checklist rows from User KYC snapshot.
 * Row statuses are heuristic (single global kycStatus until per-item review exists).
 */

export const KYC_UPLOAD_DOCUMENT_TYPES = [
  "government_id",
  "selfie_with_id",
  "tesda_certificate",
  "training_certificate",
  "business_permit",
  "bir_registration",
  "bank_verification",
  "background_check",
  "other",
] as const;

export type KycUploadDocumentType = (typeof KYC_UPLOAD_DOCUMENT_TYPES)[number];

export type VerificationChecklistStatus = "Verified" | "Pending" | "Rejected";

export interface VerificationChecklistItem {
  id: string;
  title: string;
  status: VerificationChecklistStatus;
  /** Empty when Verified */
  nextSteps: string;
}

export interface KycVerificationSnapshot {
  kycStatus: "none" | "pending" | "approved" | "rejected";
  kycDocuments: { type: string }[];
  accountType: "personal" | "business";
  /** PESO/profile certifications array length */
  profileCertificationsCount?: number;
  kycRejectionReason?: string | null;
}

const CERT_DOC_TYPES = new Set([
  "tesda_certificate",
  "training_certificate",
  "certification",
]);

function docTypes(docs: { type: string }[]): Set<string> {
  return new Set(docs.map((d) => d.type));
}

function hasRejected(snapshot: KycVerificationSnapshot): boolean {
  return snapshot.kycStatus === "rejected";
}

function isApproved(snapshot: KycVerificationSnapshot): boolean {
  return snapshot.kycStatus === "approved";
}

function identityRejectedReason(snapshot: KycVerificationSnapshot): string {
  if (snapshot.kycRejectionReason?.trim()) return snapshot.kycRejectionReason.trim();
  return "Review the rejection feedback, update your documents, and resubmit Government ID and Selfie with ID.";
}

function pendingOtherWhileRejected(snapshot: KycVerificationSnapshot): string {
  return hasRejected(snapshot)
    ? `Resolve identity verification first.${snapshot.kycRejectionReason ? ` ${snapshot.kycRejectionReason}` : ""}`
    : "";
}

export function buildVerificationChecklist(
  snapshot: KycVerificationSnapshot
): VerificationChecklistItem[] {
  const types = docTypes(snapshot.kycDocuments);
  const hasGov = types.has("government_id");
  const hasSelfie = types.has("selfie_with_id");
  const hasBizPermit = types.has("business_permit");
  const hasBir = types.has("bir_registration");
  const hasBg = types.has("background_check");
  const profileCerts = snapshot.profileCertificationsCount ?? 0;
  const hasCertEvidence =
    [...types].some((t) => CERT_DOC_TYPES.has(t)) || profileCerts > 0;

  const rejectedOther = pendingOtherWhileRejected(snapshot);

  const identity: VerificationChecklistItem = (() => {
    if (hasRejected(snapshot)) {
      return {
        id: "identity",
        title: "Identity verification",
        status: "Rejected",
        nextSteps: identityRejectedReason(snapshot),
      };
    }
    if (hasGov && hasSelfie && isApproved(snapshot)) {
      return {
        id: "identity",
        title: "Identity verification",
        status: "Verified",
        nextSteps: "",
      };
    }
    const missing: string[] = [];
    if (!hasGov) missing.push("Government-issued ID");
    if (!hasSelfie) missing.push("Selfie with ID");
    let next = "";
    if (missing.length) {
      next = `Upload: ${missing.join(" and ")}.`;
    } else if (snapshot.kycStatus === "pending") {
      next = "Documents submitted—awaiting admin review (typically 1–3 business days).";
    } else {
      next = "Submit identity documents for review.";
    }
    return {
      id: "identity",
      title: "Identity verification",
      status: "Pending",
      nextSteps: next,
    };
  })();

  const business: VerificationChecklistItem = (() => {
    if (snapshot.accountType !== "business") {
      return {
        id: "business_registration",
        title: "Business registration",
        status: "Pending",
        nextSteps:
          "Not required for personal accounts unless you operate as a registered business—upload a Business Permit or switch your account to business if applicable.",
      };
    }
    if (hasRejected(snapshot)) {
      return {
        id: "business_registration",
        title: "Business registration",
        status: "Pending",
        nextSteps:
          rejectedOther ||
          "Resolve identity verification first; then ensure your business permit is clear and matches your business name.",
      };
    }
    if (hasBizPermit && isApproved(snapshot)) {
      return {
        id: "business_registration",
        title: "Business registration",
        status: "Verified",
        nextSteps: "",
      };
    }
    if (hasBizPermit && snapshot.kycStatus === "pending") {
      return {
        id: "business_registration",
        title: "Business registration",
        status: "Pending",
        nextSteps: "Business permit on file—awaiting review with your KYC submission.",
      };
    }
    return {
      id: "business_registration",
      title: "Business registration",
      status: "Pending",
      nextSteps:
        "Upload DTI/SEC registration or mayor's/business permit matching your registered business.",
    };
  })();

  const tin: VerificationChecklistItem = (() => {
    if (hasRejected(snapshot)) {
      return {
        id: "tin_validation",
        title: "TIN validation",
        status: "Pending",
        nextSteps:
          rejectedOther ||
          "After identity is cleared, upload BIR COR / TIN documentation.",
      };
    }
    if (hasBir && isApproved(snapshot)) {
      return {
        id: "tin_validation",
        title: "TIN validation",
        status: "Verified",
        nextSteps: "",
      };
    }
    if (hasBir && snapshot.kycStatus === "pending") {
      return {
        id: "tin_validation",
        title: "TIN validation",
        status: "Pending",
        nextSteps: "BIR/TIN document submitted—awaiting review.",
      };
    }
    if (snapshot.accountType !== "business") {
      return {
        id: "tin_validation",
        title: "TIN validation",
        status: "Pending",
        nextSteps:
          "Typically required for business payouts and tax compliance—upload BIR Certificate of Registration or Form 2303 when operating as a business.",
      };
    }
    return {
      id: "tin_validation",
      title: "TIN validation",
      status: "Pending",
      nextSteps:
        "Upload your BIR Certificate of Registration (Form 2303) or official document showing TIN for validation.",
    };
  })();

  const certifications: VerificationChecklistItem = (() => {
    if (hasRejected(snapshot)) {
      return {
        id: "certifications",
        title: "Certifications",
        status: "Pending",
        nextSteps:
          rejectedOther ||
          "Optional trade certs can be added after identity verification passes.",
      };
    }
    if (hasCertEvidence && isApproved(snapshot)) {
      return {
        id: "certifications",
        title: "Certifications",
        status: "Verified",
        nextSteps: "",
      };
    }
    if (hasCertEvidence && snapshot.kycStatus === "pending") {
      return {
        id: "certifications",
        title: "Certifications",
        status: "Pending",
        nextSteps: "Certification documents on file—awaiting review.",
      };
    }
    return {
      id: "certifications",
      title: "Certifications",
      status: "Pending",
      nextSteps:
        "Upload TESDA/NC or other professional certificates (optional but improves trust), or add certifications on your provider profile.",
    };
  })();

  const background: VerificationChecklistItem = (() => {
    if (hasRejected(snapshot)) {
      return {
        id: "background_checks",
        title: "Background checks",
        status: "Pending",
        nextSteps:
          rejectedOther ||
          "Upload NBI or police clearance after resolving identity verification.",
      };
    }
    if (hasBg && isApproved(snapshot)) {
      return {
        id: "background_checks",
        title: "Background checks",
        status: "Verified",
        nextSteps: "",
      };
    }
    if (hasBg && snapshot.kycStatus === "pending") {
      return {
        id: "background_checks",
        title: "Background checks",
        status: "Pending",
        nextSteps: "Clearance document submitted—awaiting review.",
      };
    }
    return {
      id: "background_checks",
      title: "Background checks",
      status: "Pending",
      nextSteps:
        "Upload NBI clearance or police clearance to earn the strongest trust signal.",
    };
  })();

  return [identity, business, tin, certifications, background];
}
