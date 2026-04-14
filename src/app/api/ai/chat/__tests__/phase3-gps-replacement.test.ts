import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { geoVerificationService } from "@/services/geo-verification.service";
import { providerReplacementService } from "@/services/provider-replacement.service";
import { jobRepository } from "@/repositories/job.repository";
import { userRepository } from "@/repositories/user.repository";
import { GeoCheckIn } from "@/models/GeoCheckIn";
import { activityRepository } from "@/repositories/activity.repository";
import { notificationRepository } from "@/repositories/notification.repository";
import mongoose from "mongoose";

// Test data generators
function createTestJob(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    clientId: new mongoose.Types.ObjectId(),
    providerId: new mongoose.Types.ObjectId(),
    title: "Test Job",
    description: "Test job description",
    category: "cleaning",
    budget: 5000,
    status: "assigned",
    location: "Makati, Metro Manila",
    coordinates: {
      type: "Point",
      coordinates: [121.0243, 14.5547], // Makati coordinates [lng, lat]
    },
    scheduleDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    ...overrides,
  };
}

function createTestUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: `test-${Date.now()}@example.com`,
    firstName: "Test",
    lastName: "Provider",
    avgRating: 4.8,
    ...overrides,
  };
}

describe("Phase 3: GPS Attendance & Provider Replacement", () => {
  beforeEach(async () => {
    // Clean up test data
    await GeoCheckIn.deleteMany({});
  });

  afterEach(async () => {
    // Clean up
    await GeoCheckIn.deleteMany({});
  });

  describe("GeoVerificationService", () => {
    describe("GPS Check-in Validation", () => {
      it("should accept check-in within 100m geofence", async () => {
        const job = createTestJob();
        const provider = createTestUser();

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        // Makati center: [121.0243, 14.5547]
        // ~50m away: [121.02492, 14.55503]
        const result = await geoVerificationService.verifyCheckIn({
          jobId: job._id!.toString(),
          providerId: provider._id!.toString(),
          latitude: 14.55503,
          longitude: 121.02492,
          accuracy: 5,
          platform: "ios",
          appVersion: "1.0.0",
        });

        expect(result.isValid).toBe(true);
        expect(result.isWithinGeofence).toBe(true);
        expect(result.distance).toBeLessThan(100); // Should be ~50m
        expect(result.message).toContain("within");
      });

      it("should reject check-in outside 100m geofence", async () => {
        const job = createTestJob();
        const provider = createTestUser();

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        // Makati center: [121.0243, 14.5547]
        // ~500m away: [121.02913, 14.55917]
        const result = await geoVerificationService.verifyCheckIn({
          jobId: job._id!.toString(),
          providerId: provider._id!.toString(),
          latitude: 14.55917,
          longitude: 121.02913,
          accuracy: 5,
          platform: "android",
          appVersion: "1.0.0",
        });

        expect(result.isValid).toBe(false);
        expect(result.isWithinGeofence).toBe(false);
        expect(result.distance).toBeGreaterThan(100); // Should be ~500m
        expect(result.message).toContain("geofence");
      });

      it("should preserve GPS accuracy metadata", async () => {
        const job = createTestJob();
        const provider = createTestUser();

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        await geoVerificationService.verifyCheckIn({
          jobId: job._id!.toString(),
          providerId: provider._id!.toString(),
          latitude: 14.55503,
          longitude: 121.02492,
          accuracy: 15, // 15m accuracy
          platform: "web",
          appVersion: "2.0.0",
        });

        const checkIn = await GeoCheckIn.findOne({
          jobId: job._id,
          providerId: provider._id,
        });

        expect(checkIn?.accuracy).toBe(15);
        expect(checkIn?.deviceInfo?.platform).toBe("web");
        expect(checkIn?.deviceInfo?.appVersion).toBe("2.0.0");
      });

      it("should detect on-time vs late check-ins", async () => {
        // Past scheduled time
        const pastJob = createTestJob({
          scheduleDate: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        });

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(pastJob as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);

        const result = await geoVerificationService.verifyCheckIn({
          jobId: pastJob._id!.toString(),
          providerId: new mongoose.Types.ObjectId().toString(),
          latitude: 14.55503,
          longitude: 121.02492,
          accuracy: 5,
          platform: "ios",
        });

        // Within 30 min grace period = on_time
        expect(result.status).toBe("on_time");

        // Now test seriously late (31+ min)
        const lateJob = createTestJob({
          scheduleDate: new Date(Date.now() - 31 * 60 * 1000), // 31 min ago
        });

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(lateJob as any);

        const lateResult = await geoVerificationService.verifyCheckIn({
          jobId: lateJob._id!.toString(),
          providerId: new mongoose.Types.ObjectId().toString(),
          latitude: 14.55503,
          longitude: 121.02492,
          accuracy: 5,
          platform: "ios",
        });

        // Beyond 30 min = late
        expect(lateResult.status).toBe("late");
      });
    });

    describe("No-Show Detection", () => {
      it("should detect provider no-show after 30+ minutes", async () => {
        const job = createTestJob({
          scheduleDate: new Date(Date.now() - 35 * 60 * 1000), // 35 min ago
        });

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);
        vi.spyOn(notificationRepository, "create").mockResolvedValue({} as any);

        const noShowEvent = await geoVerificationService.processNoShow(
          job._id!.toString()
        );

        expect(noShowEvent).not.toBeNull();
        expect(noShowEvent?.minutesLate).toBeGreaterThanOrEqual(30);
        expect(noShowEvent?.shouldEscalate).toBe(true);
        expect(noShowEvent?.suggestReplacement).toBe(true);
      });

      it("should not flag as no-show before 30 minute threshold", async () => {
        const job = createTestJob({
          scheduleDate: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        });

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);

        const noShowEvent = await geoVerificationService.processNoShow(
          job._id!.toString()
        );

        expect(noShowEvent).toBeNull(); // Not a no-show yet
      });

      it("should not flag as no-show if valid check-in exists", async () => {
        const job = createTestJob({
          scheduleDate: new Date(Date.now() - 35 * 60 * 1000), // 35 min ago
        });

        // Create existing valid check-in
        const checkIn = {
          jobId: job._id,
          providerId: job.providerId,
          isValidCheckIn: true,
          checkInStatus: "on_time",
          latitude: 14.55503,
          longitude: 121.02492,
          accuracy: 5,
          distanceToJobLocation: 50,
          attemptNumber: 1,
        };

        await GeoCheckIn.create(checkIn);

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);

        const noShowEvent = await geoVerificationService.processNoShow(
          job._id!.toString()
        );

        expect(noShowEvent).toBeNull(); // Valid check-in exists, not a no-show
      });
    });

    describe("No-Show Pattern Analysis", () => {
      it("should flag provider with 30%+ no-show rate", async () => {
        const providerId = new mongoose.Types.ObjectId().toString();

        // Create 10 check-ins, 4 are no-shows (40% rate)
        const checkIns = [];
        for (let i = 0; i < 10; i++) {
          checkIns.push({
            jobId: new mongoose.Types.ObjectId(),
            providerId: new mongoose.Types.ObjectId(providerId),
            isValidCheckIn: i < 6, // 6 valid, 4 invalid
            checkInStatus: i < 6 ? "on_time" : "no_show",
            latitude: 14 + i * 0.001,
            longitude: 121 + i * 0.001,
            accuracy: 5,
            distanceToJobLocation: i < 6 ? 50 : 500,
            attemptNumber: 1,
          });
        }

        await GeoCheckIn.insertMany(checkIns);

        const pattern = await geoVerificationService.flagNoShowPattern(providerId);

        expect(pattern.totalJobs).toBe(10);
        expect(pattern.totalNoShows).toBe(4);
        expect(pattern.noShowRate).toBeGreaterThanOrEqual(0.3);
        expect(pattern.shouldFlag).toBe(true);
      });

      it("should not flag provider with <30% no-show rate", async () => {
        const providerId = new mongoose.Types.ObjectId().toString();

        // Create 10 check-ins, 2 are no-shows (20% rate)
        const checkIns = [];
        for (let i = 0; i < 10; i++) {
          checkIns.push({
            jobId: new mongoose.Types.ObjectId(),
            providerId: new mongoose.Types.ObjectId(providerId),
            isValidCheckIn: i < 8, // 8 valid, 2 invalid
            checkInStatus: i < 8 ? "on_time" : "no_show",
            latitude: 14 + i * 0.001,
            longitude: 121 + i * 0.001,
            accuracy: 5,
            distanceToJobLocation: i < 8 ? 50 : 500,
            attemptNumber: 1,
          });
        }

        await GeoCheckIn.insertMany(checkIns);

        const pattern = await geoVerificationService.flagNoShowPattern(providerId);

        expect(pattern.noShowRate).toBeLessThan(0.3);
        expect(pattern.shouldFlag).toBe(false);
      });

      it("should track recent no-shows separately", async () => {
        const providerId = new mongoose.Types.ObjectId().toString();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Old no-show (31 days ago)
        await GeoCheckIn.create({
          jobId: new mongoose.Types.ObjectId(),
          providerId: new mongoose.Types.ObjectId(providerId),
          isValidCheckIn: false,
          checkInStatus: "no_show",
          latitude: 14,
          longitude: 121,
          accuracy: 5,
          distanceToJobLocation: 500,
          attemptNumber: 1,
          createdAt: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000),
        });

        // Recent no-shows (today)
        for (let i = 0; i < 3; i++) {
          await GeoCheckIn.create({
            jobId: new mongoose.Types.ObjectId(),
            providerId: new mongoose.Types.ObjectId(providerId),
            isValidCheckIn: false,
            checkInStatus: "no_show",
            latitude: 14 + i * 0.001,
            longitude: 121 + i * 0.001,
            accuracy: 5,
            distanceToJobLocation: 500,
            attemptNumber: 1,
          });
        }

        const pattern = await geoVerificationService.flagNoShowPattern(providerId);

        expect(pattern.totalNoShows).toBe(4); // All no-shows
        expect(pattern.recentNoShows).toBe(3); // Only recent ones in 30 days
      });
    });

    describe("Analytics Report Generation", () => {
      it("should generate accurate performance metrics", async () => {
        const providerId = new mongoose.Types.ObjectId().toString();

        // Create mix of check-in results
        const checkIns = [
          { status: "on_time", distance: 50 },
          { status: "on_time", distance: 65 },
          { status: "late", distance: 45 },
          { status: "no_show", distance: 500 },
        ];

        for (const checkIn of checkIns) {
          await GeoCheckIn.create({
            jobId: new mongoose.Types.ObjectId(),
            providerId: new mongoose.Types.ObjectId(providerId),
            isValidCheckIn: checkIn.distance < 100,
            checkInStatus: checkIn.status,
            latitude: 14,
            longitude: 121,
            accuracy: 5,
            distanceToJobLocation: checkIn.distance,
            attemptNumber: 1,
          });
        }

        const report = await geoVerificationService.generateReport(
          providerId,
          30
        );

        expect(report.totalJobs).toBe(4);
        expect(report.validCheckIns).toBe(2); // on_time with distance < 100
        expect(report.lateCheckIns).toBe(1);
        expect(report.noShows).toBe(1);
        expect(report.avgDistance).toBeCloseTo(265, 0); // (50+65+45+500)/4
        expect(report.onTimeRate).toBe(0.5); // 2 valid out of 4
      });
    });
  });

  describe("ProviderReplacementService", () => {
    describe("Finding Replacement Providers", () => {
      it("should find replacement providers excluding tried ones", async () => {
        const job = createTestJob();
        const originalProvider = createTestUser();
        const candidateProviders = [
          createTestUser({ avgRating: 4.9 }),
          createTestUser({ avgRating: 4.7 }),
          createTestUser({ avgRating: 4.8 }),
        ];

        // Mock provider matcher
        vi.mock("@/services/provider-matcher.service", () => ({
          providerMatcherService: {
            findProvidersForJob: vi.fn().mockResolvedValue(
              candidateProviders.map((p) => ({
                providerId: p._id,
                user: p,
                matchScore: Math.random() * 30 + 70, // 70-100
                reason: "Matching criteria met",
              }))
            ),
          },
        }));

        // Import after mock is set up
        const { providerReplacementService } = await import(
          "@/services/provider-replacement.service"
        );

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);

        const replacements = await providerReplacementService.findReplacementProviders(
          job._id!.toString(),
          [originalProvider._id!.toString()]
        );

        expect(replacements.length).toBeGreaterThan(0);
        expect(
          replacements.map((r) => r.providerId)
        ).not.toContain(originalProvider._id!.toString());
      });

      it("should return empty list when no candidates available", async () => {
        const job = createTestJob();

        vi.mock("@/services/provider-matcher.service", () => ({
          providerMatcherService: {
            findProvidersForJob: vi.fn().mockResolvedValue([]),
          },
        }));

        const { providerReplacementService } = await import(
          "@/services/provider-replacement.service"
        );

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);

        const replacements = await providerReplacementService.findReplacementProviders(
          job._id!.toString()
        );

        expect(replacements.length).toBe(0);
      });
    });

    describe("Provider Replacement Execution", () => {
      it("should escalate to admin after 2 failed replacement attempts", async () => {
        const job = createTestJob();

        // Mock existing replacement attempts
        vi.spyOn(activityRepository, "findByJobId").mockResolvedValue(
          Array(2).fill({
            eventType: "provider_replacement",
            metadata: { previousProviderId: "provider-x" },
            createdAt: new Date(),
          }) as any
        );

        vi.spyOn(jobRepository, "updateById").mockResolvedValue({} as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);
        vi.spyOn(notificationRepository, "create").mockResolvedValue({} as any);

        const result = await providerReplacementService.replaceProvider({
          jobId: job._id!.toString(),
          currentProviderId: job.providerId!.toString(),
          reason: "no_show",
          attemptNumber: 3,
        });

        expect(result.escalatedToAdmin).toBe(true);
        expect(result.success).toBe(false);
        expect(result.message).toContain("escalated");
      });

      it("should assign first available replacement provider", async () => {
        const job = createTestJob();
        const newProvider = createTestUser({ avgRating: 4.9 });

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
        vi.spyOn(jobRepository, "updateById").mockResolvedValue({} as any);
        vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);
        vi.spyOn(activityRepository, "findByJobId").mockResolvedValue([]);
        vi.spyOn(userRepository, "findById").mockResolvedValue(newProvider as any);
        vi.spyOn(notificationRepository, "create").mockResolvedValue({} as any);

        const mockFindReplacements = vi
          .spyOn(providerReplacementService, "findReplacementProviders")
          .mockResolvedValue([
            {
              providerId: newProvider._id!.toString(),
              providerName: "New Provider",
              rating: 4.9,
              matchScore: 92,
              reason: "Top match",
            },
          ]);

        const result = await providerReplacementService.replaceProvider({
          jobId: job._id!.toString(),
          currentProviderId: job.providerId!.toString(),
          reason: "no_show",
          attemptNumber: 1,
        });

        expect(result.success).toBe(true);
        expect(result.newProviderId).toBe(newProvider._id!.toString());
        expect(jobRepository.updateById).toHaveBeenCalledWith(job._id!.toString(), {
          providerId: expect.any(Object),
          status: "assigned",
        });
      });
    });

    describe("Replacement Report Generation", () => {
      it("should track replacement history accurately", async () => {
        const job = createTestJob();
        const replacementActivities = [
          {
            eventType: "provider_replacement",
            metadata: { previousProviderId: "provider-1", reason: "no_show" },
            createdAt: new Date(),
          },
          {
            eventType: "provider_replacement",
            metadata: { previousProviderId: "provider-2", reason: "rejection" },
            createdAt: new Date(),
          },
        ];

        vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
        vi.spyOn(activityRepository, "findByJobId").mockResolvedValue(
          replacementActivities as any
        );

        const report = await providerReplacementService.generateReplacementReport(
          job._id!.toString()
        );

        expect(report).not.toBeNull();
        expect(report?.totalAttempts).toBe(2);
        expect(report?.replacementHistory.length).toBe(2);
      });
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete no-show to replacement workflow", async () => {
      const job = createTestJob({
        scheduleDate: new Date(Date.now() - 35 * 60 * 1000), // 35 min ago
      });
      const newProvider = createTestUser({ avgRating: 4.8 });

      // Step 1: Detect no-show
      vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
      vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);
      vi.spyOn(notificationRepository, "create").mockResolvedValue({} as any);

      const noShowEvent = await geoVerificationService.processNoShow(
        job._id!.toString()
      );

      expect(noShowEvent).not.toBeNull();

      // Step 2: Trigger replacement
      vi.spyOn(activityRepository, "findByJobId").mockResolvedValue([]);
      vi.spyOn(jobRepository, "updateById").mockResolvedValue({} as any);
      vi.spyOn(userRepository, "findById").mockResolvedValue(newProvider as any);

      vi.spyOn(providerReplacementService, "findReplacementProviders").mockResolvedValue(
        [
          {
            providerId: newProvider._id!.toString(),
            providerName: "New Provider",
            rating: 4.8,
            matchScore: 88,
            reason: "Good match",
          },
        ]
      );

      const replacementResult = await providerReplacementService.replaceProvider({
        jobId: job._id!.toString(),
        currentProviderId: job.providerId!.toString(),
        reason: "no_show",
        attemptNumber: 1,
      });

      expect(replacementResult.success).toBe(true);
      expect(jobRepository.updateById).toHaveBeenCalled();
    });

    it("should enforce 2-replacement maximum before admin escalation", async () => {
      const job = createTestJob();
      const replacementAttempts = [
        {
          eventType: "provider_replacement",
          metadata: { previousProviderId: "provider-1" },
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
        },
        {
          eventType: "provider_replacement",
          metadata: { previousProviderId: "provider-2" },
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
        },
      ];

      vi.spyOn(jobRepository, "getDocById").mockResolvedValue(job as any);
      vi.spyOn(activityRepository, "findByJobId").mockResolvedValue(
        replacementAttempts as any
      );
      vi.spyOn(jobRepository, "updateById").mockResolvedValue({} as any);
      vi.spyOn(activityRepository, "log").mockResolvedValue(undefined);
      vi.spyOn(notificationRepository, "create").mockResolvedValue({} as any);

      // Third replacement attempt should escalate
      const result = await providerReplacementService.replaceProvider({
        jobId: job._id!.toString(),
        currentProviderId: job.providerId!.toString(),
        reason: "no_show",
        attemptNumber: 3,
      });

      expect(result.escalatedToAdmin).toBe(true);
      expect(result.success).toBe(false);
    });
  });
});
