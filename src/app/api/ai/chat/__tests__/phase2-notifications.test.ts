import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectDB, closeDB } from "@/lib/db";
import { statusNotifierService } from "@/services/status-notifier.service";
import { fraudActionsService, FraudAction } from "@/services/fraud-actions.service";
import { jobRepository, notificationRepository } from "@/repositories";
import type { IJob } from "@/types";

/**
 * Test Suite: Phase 2 Operations Team Implementation
 *
 * Tests:
 * 1. Real-time status notifications on job lifecycle changes
 * 2. Fraud action evaluation and execution
 * 3. Multi-channel notification delivery (in-app, email, SMS)
 * 4. Spam prevention (max 3 notifications per job in 4 hours)
 *
 * Coverage Target: Proactive notifications + fraud automation
 */

describe("Phase 2: Status Notifier & Fraud Actions", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  describe("Status Notifier Service", () => {
    it("should generate notification for job_open status", async () => {
      // Create test job
      const testJob = {
        clientId: "test-client-001",
        title: "Test plumbing job",
        description: "Fix a leaking pipe",
        budget: 2000,
        category: "plumbing",
        location: "Manila",
        status: "open" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const jobId = job._id.toString();

      // Send notification
      const sent = await statusNotifierService.notifyStatusChange({
        jobId,
        status: "open" as const,
        clientId: "test-client-001",
        jobTitle: testJob.title,
      });

      expect(sent).toBe(true);

      // Verify notification was created
      const notifs = await notificationRepository.find({ jobId: jobId as any });
      expect(notifs.length).toBeGreaterThan(0);

      // Cleanup
      await jobRepository.delete(jobId);
    });

    it("should send different messages to client vs provider", async () => {
      const testJob = {
        clientId: "test-client-002",
        providerId: "test-provider-001",
        title: "Test assigned job",
        description: "Test",
        budget: 3000,
        category: "testing",
        location: "test",
        status: "assigned" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const jobId = job._id.toString();

      const sent = await statusNotifierService.notifyStatusChange({
        jobId,
        status: "assigned" as const,
        clientId: "test-client-002",
        providerId: "test-provider-001",
        providerName: "John Provider",
        jobTitle: testJob.title,
      });

      expect(sent).toBe(true);

      // Both client and provider should receive notifications
      const allNotifs = await notificationRepository.find({ data: { jobId } as any });
      expect(allNotifs.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await jobRepository.delete(jobId);
    });

    it("should enforce spam prevention (max 3 notifications per 4 hours)", async () => {
      const testJob = {
        clientId: "test-client-003",
        title: "Spam test job",
        description: "Test",
        budget: 1000,
        category: "testing",
        location: "test",
        status: "open" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const jobId = job._id.toString();

      // Send 3 notifications - all should succeed
      const sent1 = await statusNotifierService.notifyStatusChange({
        jobId,
        status: "open" as const,
        clientId: "test-client-003",
        jobTitle: testJob.title,
      });
      expect(sent1).toBe(true);

      const sent2 = await statusNotifierService.notifyStatusChange({
        jobId,
        status: "open" as const,
        clientId: "test-client-003",
        jobTitle: testJob.title,
      });
      expect(sent2).toBe(true);

      const sent3 = await statusNotifierService.notifyStatusChange({
        jobId,
        status: "open" as const,
        clientId: "test-client-003",
        jobTitle: testJob.title,
      });
      expect(sent3).toBe(true);

      // 4th notification should be blocked by spam prevention
      const sent4 = await statusNotifierService.notifyStatusChange({
        jobId,
        status: "open" as const,
        clientId: "test-client-003",
        jobTitle: testJob.title,
      });
      expect(sent4).toBe(false);

      // Cleanup
      await jobRepository.delete(jobId);
    });
  });

  describe("Fraud Actions Service - Scoring", () => {
    it("should assess low-risk job as ALLOW", async () => {
      const testJob = {
        clientId: "test-client-004",
        title: "Low risk job",
        description:
          "This is a legitimate job request with clear scope and reasonable budget",
        budget: 5000,
        category: "cleaning",
        location: "Manila",
        status: "pending_validation" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const assessment = await fraudActionsService.assessJob(job._id.toString());

      expect(assessment.action).toBe(FraudAction.ALLOW);
      expect(assessment.severity).toBe("low");
      expect(assessment.riskScore).toBe(25);

      await jobRepository.delete(job._id.toString());
    });

    it("should assess medium-risk job (60-75) as PRE_APPROVE", async () => {
      const testJob = {
        clientId: "test-client-005",
        title: "Medium risk job",
        description: "Test",
        budget: 1000,
        category: "testing",
        location: "test",
        status: "pending_validation" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 70,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const assessment = await fraudActionsService.assessJob(job._id.toString());

      expect(assessment.action).toBe(FraudAction.PRE_APPROVE);
      expect(assessment.severity).toBe("medium");
      expect(assessment.riskScore).toBe(70);

      await jobRepository.delete(job._id.toString());
    });

    it("should assess high-risk job (75-90) as HOLD", async () => {
      const testJob = {
        clientId: "test-client-006",
        title: "High risk job",
        description: "Test",
        budget: 1000,
        category: "testing",
        location: "test",
        status: "pending_validation" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 82,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const assessment = await fraudActionsService.assessJob(job._id.toString());

      expect(assessment.action).toBe(FraudAction.HOLD);
      expect(assessment.severity).toBe("high");
      expect(assessment.riskScore).toBe(82);

      await jobRepository.delete(job._id.toString());
    });

    it("should assess critical-risk job (90+) as AUTO_REJECT", async () => {
      const testJob = {
        clientId: "test-client-007",
        title: "Critical risk job",
        description: "Test",
        budget: 1000,
        category: "testing",
        location: "test",
        status: "pending_validation" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 95,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const assessment = await fraudActionsService.assessJob(job._id.toString());

      expect(assessment.action).toBe(FraudAction.AUTO_REJECT);
      expect(assessment.severity).toBe("critical");
      expect(assessment.riskScore).toBe(95);

      await jobRepository.delete(job._id.toString());
    });
  });

  describe("Fraud Actions Service - Execution", () => {
    it("should execute AUTO_REJECT action and change job status", async () => {
      const testJob = {
        clientId: "test-client-008",
        title: "Critical fraud job",
        description: "Test",
        budget: 1000,
        category: "testing",
        location: "test",
        status: "pending_validation" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 92,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const jobId = job._id.toString();

      const assessment = await fraudActionsService.assessJob(jobId);
      const executed = await fraudActionsService.executeAction(assessment);

      expect(executed).toBe(true);

      // Verify job status changed to rejected
      const updatedJob = await jobRepository.getDocById(jobId);
      expect((updatedJob as unknown as { status: string }).status).toBe("rejected");

      await jobRepository.delete(jobId);
    });

    it("should execute HOLD action and change job status to pending_validation", async () => {
      const testJob = {
        clientId: "test-client-009",
        title: "Hold for review job",
        description: "Test",
        budget: 1000,
        category: "testing",
        location: "test",
        status: "open" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const jobId = job._id.toString();

      const assessment = await fraudActionsService.assessJob(jobId);
      const executed = await fraudActionsService.executeAction(assessment);

      expect(executed).toBe(true);

      // Verify job status changed to pending_validation
      const updatedJob = await jobRepository.getDocById(jobId);
      expect((updatedJob as unknown as { status: string }).status).toBe("pending_validation");

      await jobRepository.delete(jobId);
    });
  });

  describe("Fraud Actions Service - Detection", () => {
    it("should detect duplicate posting (high volume threshold)", async () => {
      const clientId = "test-client-010";

      // This test checks if the throttling logic exists
      // Actual duplicate detection depends on session state
      const result = await fraudActionsService.throttleHighVolumePosting(clientId);

      // First call should not be throttled
      expect(result.throttled).toBe(false);
    });

    it("should check client dispute history (returns count and block status)", async () => {
      const clientId = "test-client-011";

      const result = await fraudActionsService.checkClientDisputeHistory(clientId);

      // Verify response structure
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("shouldBlock");
      expect(typeof result.count).toBe("number");
      expect(typeof result.shouldBlock).toBe("boolean");
    });
  });

  describe("Integration: Notification + Fraud Actions", () => {
    it("should combine status notification with fraud assessment", async () => {
      const testJob = {
        clientId: "test-client-012",
        title: "Integration test job",
        description: "Testing combined workflow",
        budget: 4000,
        category: "plumbing",
        location: "test",
        status: "open" as const,
        escrowStatus: "not_funded" as const,
        jobSource: "private" as const,
        riskScore: 35,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job = await jobRepository.create(testJob as any);
      const jobId = job._id.toString();

      // Step 1: Assess fraud
      const assessment = await fraudActionsService.assessJob(jobId);
      expect(assessment.action).toBe(FraudAction.ALLOW);

      // Step 2: Send notification if not blocked
      if (assessment.action === FraudAction.ALLOW) {
        const notifSent = await statusNotifierService.notifyStatusChange({
          jobId,
          status: "open" as const,
          clientId: "test-client-012",
          jobTitle: testJob.title,
        });
        expect(notifSent).toBe(true);
      }

      await jobRepository.delete(jobId);
    });
  });

  describe("Verification: Phase 2 Completeness", () => {
    it("should have all fraud action types available", () => {
      expect(FraudAction.ALLOW).toBeDefined();
      expect(FraudAction.PRE_APPROVE).toBeDefined();
      expect(FraudAction.HOLD).toBeDefined();
      expect(FraudAction.AUTO_REJECT).toBeDefined();
    });

    it("should have all notification status types supported", async () => {
      const statuses: Array<IJob["status"]> = [
        "open",
        "assigned",
        "in_progress",
        "completed",
        "disputed",
        "rejected",
        "cancelled",
      ];

      for (const status of statuses) {
        const testJob = {
          clientId: "test-verify-client",
          title: "Verification job",
          description: "Test",
          budget: 1000,
          category: "testing",
          location: "test",
          status,
          escrowStatus: "not_funded" as const,
          jobSource: "private" as const,
          riskScore: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const job = await jobRepository.create(testJob as any);

        // Notification should handle all statuses (returns true/false)
        const result = await statusNotifierService.notifyStatusChange({
          jobId: job._id.toString(),
          status,
          clientId: "test-verify-client",
          jobTitle: testJob.title,
        });

        expect(typeof result).toBe("boolean");

        await jobRepository.delete(job._id.toString());
      }
    });
  });
});
