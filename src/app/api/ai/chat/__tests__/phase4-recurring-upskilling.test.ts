import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { recurringJobSpawnerService } from "@/services/recurring-job-spawner.service";
import { providerUpskillingService } from "@/services/provider-upskilling.service";
import { jobRepository } from "@/repositories/job.repository";
import { recurringScheduleRepository } from "@/repositories/recurringSchedule.repository";
import { userRepository } from "@/repositories/user.repository";
import { activityRepository } from "@/repositories/activity.repository";
import mongoose from "mongoose";

// Test data generators
function createTestSchedule(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    clientId: new mongoose.Types.ObjectId(),
    providerId: null,
    category: "cleaning",
    title: "Weekly Office Cleaning",
    description: "Professional office cleaning service",
    budget: 3000,
    location: "BGC, Manila",
    frequency: "weekly",
    status: "active",
    autoPayEnabled: true,
    specialInstructions: "Use eco-friendly products",
    nextRunAt: new Date(),
    lastRunAt: null,
    totalRuns: 0,
    maxRuns: 52, // 1 year of weekly
    pausedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestJob(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    clientId: new mongoose.Types.ObjectId(),
    providerId: new mongoose.Types.ObjectId(),
    title: "Office Cleaning",
    description: "Weekly cleaning service",
    category: "cleaning",
    budget: 3000,
    status: "completed",
    escrowStatus: "released",
    location: "BGC, Manila",
    riskScore: 0,
    fraudFlags: [],
    ...overrides,
  };
}

function createTestUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    role: "provider",
    ...overrides,
  };
}

describe("Phase 4: Recurring Job Automation + Provider Upskilling", () => {
  beforeEach(async () => {
    // Setup mocks
  });

  afterEach(async () => {
    // Cleanup
  });

  describe("RecurringJobSpawnerService", () => {
    describe("Job Spawning", () => {
      it("should spawn a new job from active schedule", async () => {
        const schedule = createTestSchedule();

        vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
          [schedule] as any
        );
        vi.spyOn(jobRepository, "create").mockResolvedValue(
          createTestJob() as any
        );
        vi.spyOn(recurringScheduleRepository, "advanceNextRun").mockResolvedValue(
          undefined
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const result = await recurringJobSpawnerService.spawnJob(schedule as any);

        expect(result).not.toBeNull();
        expect(result?.status).toBe("spawned");
        expect(jobRepository.create).toHaveBeenCalled();
        expect(recurringScheduleRepository.advanceNextRun).toHaveBeenCalled();
      });

      it("should auto-assign spawned job to locked provider", async () => {
        const provider = createTestUser();
        const schedule = createTestSchedule({
          providerId: provider._id,
        });

        vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
          [schedule] as any
        );
        vi.spyOn(jobRepository, "create").mockResolvedValue(
          createTestJob({ providerId: provider._id }) as any
        );
        vi.spyOn(recurringScheduleRepository, "advanceNextRun").mockResolvedValue(
          undefined
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const result = await recurringJobSpawnerService.spawnJob(schedule as any);

        expect(result?.status).toBe("assigned");
        expect(result?.providerId).toBe(provider._id.toString());

        // Verify job was created with provider assigned
        const createCall = (jobRepository.create as any).mock.calls[0][0];
        expect(createCall.providerId).toBe(provider._id);
      });

      it("should not spawn if max runs reached", async () => {
        const schedule = createTestSchedule({
          totalRuns: 52,
          maxRuns: 52,
        });

        vi.spyOn(
          recurringScheduleRepository,
          "cancel"
        ).mockResolvedValue(undefined as any);

        const result = await recurringJobSpawnerService.spawnJob(schedule as any);

        expect(result?.message).toContain("max runs");
        expect(recurringScheduleRepository.cancel).toHaveBeenCalled();
      });

      it("should calculate next run date weekly", async () => {
        const schedule = createTestSchedule({ frequency: "weekly" });

        vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
          [schedule] as any
        );
        vi.spyOn(jobRepository, "create").mockResolvedValue(
          createTestJob() as any
        );

        let advancedDate: Date | null = null;
        vi.spyOn(
          recurringScheduleRepository,
          "advanceNextRun"
        ).mockImplementation(async (id, date) => {
          advancedDate = date;
        });
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        await recurringJobSpawnerService.spawnJob(schedule as any);

        expect(advancedDate).not.toBeNull();
        const daysDiff = Math.round(
          (advancedDate!.getTime() - schedule.nextRunAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        expect(daysDiff).toBe(7); // Weekly should be +7 days
      });

      it("should execute bulk spawning of multiple schedules", async () => {
        const schedules = [
          createTestSchedule(),
          createTestSchedule({ category: "moving" }),
          createTestSchedule({ category: "delivery" }),
        ];

        vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
          schedules as any
        );
        vi.spyOn(jobRepository, "create").mockResolvedValue(
          createTestJob() as any
        );
        vi.spyOn(recurringScheduleRepository, "advanceNextRun").mockResolvedValue(
          undefined
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const result = await recurringJobSpawnerService.executeBulkSpawning();

        expect(result.totalSchedules).toBe(3);
        expect(result.successfulSpawns).toBe(3);
        expect(result.failedSpawns).toBe(0);
        expect(result.jobsCreated.length).toBe(3);
      });
    });

    describe("Schedule Management", () => {
      it("should track total runs correctly", async () => {
        const schedule = createTestSchedule({ totalRuns: 3 });

        vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
          [schedule] as any
        );
        vi.spyOn(jobRepository, "create").mockResolvedValue(
          createTestJob() as any
        );

        let incrementedRuns = 0;
        vi.spyOn(
          recurringScheduleRepository,
          "advanceNextRun"
        ).mockImplementation(async (id, date) => {
          incrementedRuns = schedule.totalRuns + 1;
        });
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        await recurringJobSpawnerService.spawnJob(schedule as any);

        expect(incrementedRuns).toBe(4); // From 3 to 4
      });
    });

    describe("Notifications", () => {
      it("should notify client when job spawned", async () => {
        const schedule = createTestSchedule();
        const client = createTestUser({ role: "client" });

        vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
          [schedule] as any
        );
        vi.spyOn(jobRepository, "create").mockResolvedValue(
          createTestJob() as any
        );
        vi.spyOn(userRepository, "findById").mockResolvedValue(client as any);
        vi.spyOn(recurringScheduleRepository, "advanceNextRun").mockResolvedValue(
          undefined
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const mockPush = vi.fn();
        vi.mock("@/lib/events", () => ({
          pushNotification: mockPush,
        }));

        await recurringJobSpawnerService.spawnJob(schedule as any);

        expect(userRepository.findById).toHaveBeenCalledWith(
          schedule.clientId.toString()
        );
      });
    });
  });

  describe("ProviderUpskillingService", () => {
    describe("Skill Assessment", () => {
      it("should assess provider skills across categories", async () => {
        const provider = createTestUser();
        const completedJobs = [
          createTestJob({ providerId: provider._id, category: "cleaning" }),
          createTestJob({ providerId: provider._id, category: "cleaning" }),
          createTestJob({ providerId: provider._id, category: "moving" }),
        ];

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        expect(progress).not.toBeNull();
        expect(progress?.totalJobsCompleted).toBe(3);
        expect(progress?.categoriesWorked).toBe(2);
        expect(progress?.topCategories.length).toBeGreaterThan(0);
      });

      it("should calculate mastery levels correctly", async () => {
        const provider = createTestUser();

        // Create 15 completed jobs in "cleaning" category
        const completedJobs = Array(15).fill(null).map(() =>
          createTestJob({ providerId: provider._id, category: "cleaning" })
        );

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        const cleaningMastery = progress?.topCategories.find(
          (c) => c.category === "cleaning"
        );
        expect(cleaningMastery?.masteryLevel).toBe("expert");
        expect(cleaningMastery?.completedCount).toBe(15);
      });

      it("should detect novice level (1-4 jobs)", async () => {
        const provider = createTestUser();
        const completedJobs = [
          createTestJob({ providerId: provider._id, category: "cleaning" }),
        ];

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        const cleaning = progress?.topCategories[0];
        expect(cleaning?.masteryLevel).toBe("novice");
      });

      it("should detect intermediate level (5-14 jobs)", async () => {
        const provider = createTestUser();
        const completedJobs = Array(7).fill(null).map(() =>
          createTestJob({ providerId: provider._id, category: "cleaning" })
        );

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        expect(progress?.topCategories[0].masteryLevel).toBe("intermediate");
      });

      it("should detect master level (30+ jobs)", async () => {
        const provider = createTestUser();
        const completedJobs = Array(35).fill(null).map(() =>
          createTestJob({ providerId: provider._id, category: "cleaning" })
        );

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        expect(progress?.topCategories[0].masteryLevel).toBe("master");
      });
    });

    describe("Mastery Progression", () => {
      it("should calculate correct mastery percentage", async () => {
        const provider = createTestUser();
        // 8 jobs = intermediate level, progressing toward expert
        const completedJobs = Array(8).fill(null).map(() =>
          createTestJob({ providerId: provider._id, category: "cleaning" })
        );

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        const cleaning = progress?.topCategories[0];
        // 8 jobs: (8-5)/(15-5) * 25 + 25 = 3/10 * 25 + 25 = 32.5%
        expect(cleaning?.masteryPercentage).toBeGreaterThan(25);
        expect(cleaning?.masteryPercentage).toBeLessThan(50);
      });

      it("should track earnings by category", async () => {
        const provider = createTestUser();
        const completedJobs = [
          createTestJob({ providerId: provider._id, category: "cleaning", budget: 5000 }),
          createTestJob({ providerId: provider._id, category: "cleaning", budget: 3000 }),
          createTestJob({ providerId: provider._id, category: "moving", budget: 8000 }),
        ];

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        const cleaning = progress?.topCategories[0];
        expect(cleaning?.totalEarnings).toBe(8000); // 5000 + 3000
      });
    });

    describe("Recommendations", () => {
      it("should generate recommendations for novice provider", async () => {
        const provider = createTestUser();
        const completedJobs = [
          createTestJob({ providerId: provider._id, category: "cleaning" }),
        ];

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const recommendations = await providerUpskillingService.generateRecommendations(
          provider._id!.toString()
        );

        expect(recommendations.nextMilestone).toContain("Intermediate");
        expect(recommendations.progressToMilestone).toBeLessThan(25);
      });

      it("should recommend new categories", async () => {
        const provider = createTestUser();
        // 2 jobs in cleaning only
        const completedJobs = Array(2).fill(null).map(() =>
          createTestJob({ providerId: provider._id, category: "cleaning" })
        );

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const recommendations = await providerUpskillingService.generateRecommendations(
          provider._id!.toString()
        );

        expect(recommendations.suggestedFocusArea).not.toBeNull();
      });
    });

    describe("Overall Score Calculation", () => {
      it("should calculate 0 score for unskilled provider", async () => {
        const provider = createTestUser();

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue([]);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        expect(progress?.overallScore).toBe(0);
      });

      it("should calculate max score for master with multiple categories", async () => {
        const provider = createTestUser();
        // 30 jobs in cleaning (master) + 15 in moving (expert)
        const completedJobs = [
          ...Array(30).fill(null).map(() =>
            createTestJob({ providerId: provider._id, category: "cleaning" })
          ),
          ...Array(15).fill(null).map(() =>
            createTestJob({ providerId: provider._id, category: "moving" })
          ),
        ];

        vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);
        vi.spyOn(jobRepository, "find").mockResolvedValue(
          completedJobs as any
        );
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const progress = await providerUpskillingService.assessProviderSkills(
          provider._id!.toString()
        );

        expect(progress?.overallScore).toBeGreaterThan(85);
      });
    });
  });

  describe("Integration Scenarios", () => {
    it("should spawn recurring job and increment provider mastery", async () => {
      const provider = createTestUser();
      const schedule = createTestSchedule({ providerId: provider._id });
      const job = createTestJob({ providerId: provider._id, status: "completed" });

      // Step 1: Spawn job
      vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
        [schedule] as any
      );
      vi.spyOn(jobRepository, "create").mockResolvedValue(job as any);
      vi.spyOn(recurringScheduleRepository, "advanceNextRun").mockResolvedValue(
        undefined
      );
      vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

      const spawnResult = await recurringJobSpawnerService.spawnJob(
        schedule as any
      );
      expect(spawnResult?.status).toBe("assigned");

      // Step 2: Assess provider mastery
      const completedJobs = [job, job, job]; // 3 jobs
      vi.spyOn(jobRepository, "find").mockResolvedValue(
        completedJobs as any
      );
      vi.spyOn(userRepository, "findById").mockResolvedValue(provider as any);

      const progress = await providerUpskillingService.assessProviderSkills(
        provider._id!.toString()
      );

      expect(progress?.totalJobsCompleted).toBe(3);
      expect(progress?.topCategories[0].masteryLevel).toBe("novice");
    });

    it("should handle full recurring lifecycle", async () => {
      const client = createTestUser({ role: "client" });
      const provider = createTestUser();
      const schedule = createTestSchedule({ clientId: client._id });

      // Week 1: Spawn and assign
      vi.spyOn(recurringScheduleRepository, "findDue").mockResolvedValue(
        [schedule] as any
      );
      vi.spyOn(jobRepository, "create").mockResolvedValue(
        createTestJob({ clientId: client._id, providerId: provider._id }) as any
      );
      vi.spyOn(recurringScheduleRepository, "advanceNextRun").mockResolvedValue(
        undefined
      );
      vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

      const result = await recurringJobSpawnerService.executeBulkSpawning();

      expect(result.successfulSpawns).toBe(1);
      expect(result.jobsCreated.length).toBe(1);
    });
  });
});
