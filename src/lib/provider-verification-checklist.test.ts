import { describe, it, expect } from "vitest";
import { buildVerificationChecklist, type KycVerificationSnapshot } from "./provider-verification-checklist";

function snap(partial: Partial<KycVerificationSnapshot>): KycVerificationSnapshot {
  return {
    kycStatus: "none",
    kycDocuments: [],
    accountType: "personal",
    profileCertificationsCount: 0,
    kycRejectionReason: null,
    ...partial,
  };
}

describe("buildVerificationChecklist", () => {
  it("marks identity Rejected when kyc rejected", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "rejected",
        kycRejectionReason: "Blurry photo",
        kycDocuments: [{ type: "government_id" }, { type: "selfie_with_id" }],
      })
    );
    expect(rows.find((r) => r.id === "identity")?.status).toBe("Rejected");
    expect(rows.find((r) => r.id === "identity")?.nextSteps).toContain("Blurry");
  });

  it("marks identity Verified when both ID docs and approved", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "approved",
        kycDocuments: [{ type: "government_id" }, { type: "selfie_with_id" }],
      })
    );
    const id = rows.find((r) => r.id === "identity");
    expect(id?.status).toBe("Verified");
    expect(id?.nextSteps).toBe("");
  });

  it("identity Pending when missing selfie", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "pending",
        kycDocuments: [{ type: "government_id" }],
      })
    );
    const id = rows.find((r) => r.id === "identity");
    expect(id?.status).toBe("Pending");
    expect(id?.nextSteps).toMatch(/Selfie/i);
  });

  it("business registration Pending for personal with guidance", () => {
    const rows = buildVerificationChecklist(snap({ accountType: "personal" }));
    const b = rows.find((r) => r.id === "business_registration");
    expect(b?.status).toBe("Pending");
    expect(b?.nextSteps).toMatch(/personal/i);
  });

  it("business registration Verified for business with permit and approved", () => {
    const rows = buildVerificationChecklist(
      snap({
        accountType: "business",
        kycStatus: "approved",
        kycDocuments: [{ type: "government_id" }, { type: "selfie_with_id" }, { type: "business_permit" }],
      })
    );
    expect(rows.find((r) => r.id === "business_registration")?.status).toBe("Verified");
  });

  it("business Pending for business account without permit", () => {
    const rows = buildVerificationChecklist(
      snap({
        accountType: "business",
        kycStatus: "approved",
        kycDocuments: [{ type: "government_id" }, { type: "selfie_with_id" }],
      })
    );
    const b = rows.find((r) => r.id === "business_registration");
    expect(b?.status).toBe("Pending");
    expect(b?.nextSteps).toMatch(/DTI|permit/i);
  });

  it("TIN Verified when bir_registration present and approved", () => {
    const rows = buildVerificationChecklist(
      snap({
        accountType: "business",
        kycStatus: "approved",
        kycDocuments: [
          { type: "government_id" },
          { type: "selfie_with_id" },
          { type: "bir_registration" },
        ],
      })
    );
    expect(rows.find((r) => r.id === "tin_validation")?.status).toBe("Verified");
  });

  it("certifications Verified from profileCertificationsCount when approved", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "approved",
        kycDocuments: [{ type: "government_id" }, { type: "selfie_with_id" }],
        profileCertificationsCount: 2,
      })
    );
    expect(rows.find((r) => r.id === "certifications")?.status).toBe("Verified");
  });

  it("certifications Verified from training_certificate doc when approved", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "approved",
        kycDocuments: [
          { type: "government_id" },
          { type: "selfie_with_id" },
          { type: "training_certificate" },
        ],
      })
    );
    expect(rows.find((r) => r.id === "certifications")?.status).toBe("Verified");
  });

  it("background Verified when background_check and approved", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "approved",
        kycDocuments: [
          { type: "government_id" },
          { type: "selfie_with_id" },
          { type: "background_check" },
        ],
      })
    );
    expect(rows.find((r) => r.id === "background_checks")?.status).toBe("Verified");
  });

  it("non-identity rows Pending with resolve-first message when rejected", () => {
    const rows = buildVerificationChecklist(
      snap({
        kycStatus: "rejected",
        accountType: "business",
        kycDocuments: [{ type: "business_permit" }, { type: "bir_registration" }],
      })
    );
    expect(rows.find((r) => r.id === "business_registration")?.status).toBe("Pending");
    expect(rows.find((r) => r.id === "tin_validation")?.nextSteps.toLowerCase()).toMatch(/identity|resolve|first/);
  });
});
