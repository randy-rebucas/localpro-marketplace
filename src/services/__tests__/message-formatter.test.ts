import { describe, it, expect } from "vitest";
import { messageFormatterService, type Persona } from "@/services/message-formatter.service";

describe("MessageFormatterService - Multi-Persona Communication Framework", () => {
  describe("Job Spawned Scenario", () => {
    it("should format customer-friendly job spawned message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_spawned",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Weekly Office Cleaning",
          budget: 3000,
          clientName: "ABC Corp",
          category: "cleaning",
        },
      });

      expect(message.title).toContain("job is live");
      expect(message.body).toContain("₱3,000");
      expect(message.body).toContain("Weekly Office Cleaning");
      expect(message.nextSteps?.length || 0).toBeGreaterThan(0);
    });

    it("should format admin dashboard job spawned message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_spawned",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "Weekly Office Cleaning",
          budget: 3000,
          clientName: "ABC Corp",
          category: "cleaning",
          location: "BGC, Manila",
          runNumber: 5,
          maxRuns: 52,
          providerId: "prov123",
        },
      });

      expect(message.title).toContain("Spawned");
      expect(message.body).toContain("Run #5 of 52");
      expect(message.body).toContain("Auto-assigned");
      expect(message.actionUrl).toContain("/admin/jobs");
    });

    it("should format provider-focused job spawned message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_spawned",
        persona: "provider",
        data: {
          jobId: "job123",
          jobTitle: "Weekly Office Cleaning",
          budget: 3000,
          clientName: "ABC Corp",
          category: "cleaning",
          location: "BGC, Manila",
        },
      });

      expect(message.title).toContain("cleaning");
      expect(message.body).toContain("₱3,000");
      expect(message.body).toContain("BGC, Manila");
      expect(message.body).toContain("ABC Corp");
      expect(message.nextSteps?.length || 0).toBeGreaterThan(0);
    });
  });

  describe("Job Assigned Scenario", () => {
    it("should format customer message for job assignment", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_assigned",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Weekly Cleaning",
          budget: 3000,
          providerName: "Juan's Cleaning",
          scheduleDate: new Date("2026-04-21"),
        },
      });

      expect(message.title).toContain("confirmed");
      expect(message.body).toContain("Juan's Cleaning");
      expect(message.body).toContain("Weekly Cleaning");
    });

    it("should format provider message for job assignment", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_assigned",
        persona: "provider",
        data: {
          jobId: "job123",
          jobTitle: "Office Cleaning",
          budget: 3000,
          clientName: "ABC Corp",
          location: "BGC, Manila",
          scheduleDate: new Date("2026-04-21"),
        },
      });

      expect(message.title).toContain("assigned");
      expect(message.body).toContain("ABC Corp");
      expect(message.body).toContain("₱3,000");
      expect(message.body).toContain("BGC, Manila");
    });
  });

  describe("Escrow Released Scenario", () => {
    it("should format customer escrow released message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "escrow_released",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Cleaning",
          budget: 5000,
          providerName: "Juan's Service",
          clientName: "Client",
          releasedAt: new Date(),
        },
      });

      expect(message.title).toContain("released");
      expect(message.body).toContain("Juan's Service");
      expect(message.body).toContain("₱5,000");
    });

    it("should format admin escrow released message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "escrow_released",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "Cleaning",
          budget: 5000,
          providerName: "Juan's Service",
          clientName: "ABC Corp",
          releasedAt: new Date(),
          autoRelease: true,
        },
      });

      expect(message.body).toContain("₱5,000");
      expect(message.body).toContain("Auto-Release");
      expect(message.actionUrl).toContain("/admin/accounting");
    });

    it("should format provider escrow released message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "escrow_released",
        persona: "provider",
        data: {
          jobId: "job123",
          jobTitle: "Cleaning",
          budget: 5000,
          providerName: "You",
          releasedAt: new Date(),
        },
      });

      expect(message.title).toContain("₱5,000");
      expect(message.body).toContain("deposited");
      expect(message.actionUrl).toContain("/wallet");
    });
  });

  describe("No-Show Detection Scenario", () => {
    it("should format customer no-show message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "no_show_detected",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "House Cleaning",
          clientName: "Client",
          providerName: "Juan",
          scheduleTime: new Date("2026-04-21 10:00"),
          attemptNumber: 1,
        },
      });

      expect(message.title).toContain("didn't show up");
      expect(message.body).toContain("replacement");
      expect(message.body).toContain("Juan");
    });

    it("should format admin no-show message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "no_show_detected",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "House Cleaning",
          clientName: "ABC Corp",
          providerName: "Juan",
          scheduleTime: new Date("2026-04-21 10:00"),
          attemptNumber: 1,
          providerId: "prov123",
        },
      });

      expect(message.title).toContain("NO-SHOW");
      expect(message.body).toContain("Attempt 1");
      expect(message.actionUrl).toContain("/admin/jobs");
    });

    it("should format provider no-show message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "no_show_detected",
        persona: "provider",
        data: {
          jobId: "job123",
          jobTitle: "House Cleaning",
          scheduleTime: new Date("2026-04-21 10:00"),
        },
      });

      expect(message.title).toContain("No-show");
      expect(message.body).toContain("reliability rating");
      expect(message.actionUrl).toContain("/support");
    });
  });

  describe("Fraud Alert Scenario", () => {
    it("should format customer fraud alert message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "fraud_alert",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Moving Service",
          riskLevel: "HIGH",
          flags: ["unusual_budget", "new_account"],
        },
      });

      expect(message.title).toContain("Security");
      expect(message.body).toContain("verifying");
      expect(message.actionUrl).toContain("/support");
    });

    it("should format admin fraud alert message with HIGH risk", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "fraud_alert",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "Moving Service",
          riskLevel: "HIGH",
          flags: ["unusual_budget", "new_account"],
          clientName: "Suspicious Client",
          clientJobCount: 0,
        },
      });

      expect(message.title).toContain("FRAUD ALERT");
      expect(message.body).toContain("HIGH");
      expect(message.body).toContain("BLOCK");
    });

    it("should format admin fraud alert message with MEDIUM risk", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "fraud_alert",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          riskLevel: "MEDIUM",
          flags: ["unusual_pattern"],
          clientName: "Client",
          clientJobCount: 2,
        },
      });

      expect(message.body).toContain("MEDIUM");
      expect(message.body).toContain("verification");
    });
  });

  describe("Skill Milestone Scenario", () => {
    it("should format customer skill milestone message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "skill_milestone",
        persona: "customer",
        data: {
          jobId: "job123",
          providerName: "Juan",
          skill: "cleaning",
          milestone: "expert",
          jobsCompleted: 15,
          providerId: "prov123",
        },
      });

      expect(message.title).toContain("expert");
      expect(message.body).toContain("mastered");
      expect(message.body).toContain("cleaning");
    });

    it("should format admin skill milestone message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "skill_milestone",
        persona: "admin",
        data: {
          jobId: "job123",
          providerName: "Juan",
          skill: "cleaning",
          milestone: "expert",
          jobsCompleted: 15,
          providerId: "prov123",
        },
      });

      expect(message.body).toContain("Feature");
      expect(message.body).toContain("higher-budget");
      expect(message.actionUrl).toContain("/admin/users");
    });

    it("should format provider skill milestone message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "skill_milestone",
        persona: "provider",
        data: {
          skill: "cleaning",
          milestone: "expert",
          jobsCompleted: 15,
          providerId: "prov123",
        },
      });

      expect(message.title).toContain("🎉");
      expect(message.title).toContain("expert");
      expect(message.body).toContain("premium");
      expect(message.actionUrl).toContain("/profile");
    });
  });

  describe("Payment Failed Scenario", () => {
    it("should format customer payment failed message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "payment_failed",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          amount: 5000,
          reason: "Card declined",
        },
      });

      expect(message.title).toContain("couldn't process");
      expect(message.body).toContain("Card declined");
      expect(message.nextSteps?.length || 0).toBeGreaterThan(0);
    });

    it("should format admin payment failed message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "payment_failed",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          amount: 5000,
          reason: "Card declined",
          clientName: "Client",
          errorCode: "CARD_DECLINED",
        },
      });

      expect(message.title).toContain("Payment Failed");
      expect(message.body).toContain("CARD_DECLINED");
      expect(message.actionUrl).toContain("/admin/jobs");
    });
  });

  describe("Provider Matched Scenario", () => {
    it("should format customer provider matched message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "provider_matched",
        persona: "customer",
        data: {
          jobId: "job123",
          providerName: "Juan's Service",
          rating: 4.8,
          expertise: "Cleaning Expert",
          providerId: "prov123",
        },
      });

      expect(message.title).toContain("Perfect match");
      expect(message.title).toContain("Juan's Service");
      expect(message.body).toContain("4.8");
      expect(message.body).toContain("Cleaning Expert");
    });

    it("should format admin provider matched message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "provider_matched",
        persona: "admin",
        data: {
          jobId: "job123",
          providerName: "Juan's Service",
          rating: 4.8,
          expertise: "Cleaning Expert",
          matchScore: 92,
          completedJobs: 45,
          providerId: "prov123",
        },
      });

      expect(message.body).toContain("92%");
      expect(message.body).toContain("45");
      expect(message.actionUrl).toContain("/admin/jobs");
    });

    it("should format provider provider matched message", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "provider_matched",
        persona: "provider",
        data: {
          jobId: "job123",
          jobTitle: "Office Cleaning",
          budget: 3000,
          clientName: "ABC Corp",
          clientRating: 4.9,
          location: "BGC, Manila",
        },
      });

      expect(message.title).toContain("opportunity");
      expect(message.body).toContain("ABC Corp");
      expect(message.body).toContain("₱3,000");
    });
  });

  describe("Message Data Payloads", () => {
    it("should include action URLs for all personas", () => {
      const personas: Persona[] = ["customer", "admin", "provider"];

      for (const persona of personas) {
        const message = messageFormatterService.formatMessage({
          scenario: "job_spawned",
          persona,
          data: {
            jobId: "job123",
            jobTitle: "Service",
            budget: 3000,
            clientName: "Client",
            category: "cleaning",
          },
        });

        expect(message.actionUrl).toBeTruthy();
      }
    });

    it("should include data payload with all messages", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_assigned",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          budget: 3000,
          providerName: "Provider",
          scheduleDate: new Date(),
        },
      });

      expect(message.dataPayload).toBeTruthy();
      expect(message.dataPayload?.jobId).toBe("job123");
    });
  });

  describe("Currency Formatting", () => {
    it("should format Philippine Peso amounts correctly", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "escrow_released",
        persona: "provider",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          budget: 12500,
          providerName: "Juan",
          releasedAt: new Date(),
        },
      });

      expect(message.title).toContain("12,500");
    });

    it("should handle small amounts", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "job_spawned",
        persona: "customer",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          budget: 500,
          clientName: "Client",
          category: "cleaning",
        },
      });

      expect(message.body).toContain("500");
    });

    it("should handle large amounts", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "escrow_released",
        persona: "admin",
        data: {
          jobId: "job123",
          jobTitle: "Service",
          budget: 999999,
          providerName: "Provider",
          clientName: "Client",
          releasedAt: new Date(),
          autoRelease: false,
        },
      });

      expect(message.body).toContain("999,999");
    });
  });

  describe("Generic Message Fallback", () => {
    it("should handle unmapped scenarios gracefully", () => {
      const message = messageFormatterService.formatMessage({
        scenario: "payment_failed" as any,
        persona: "customer",
        data: {
          title: "Custom Alert",
          message: "Something happened",
          actionUrl: "/dashboard",
        },
      });

      expect(message).toBeTruthy();
      expect(message.title).toBeTruthy();
      expect(message.body).toBeTruthy();
    });
  });
});
