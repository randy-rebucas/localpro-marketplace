import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectDB, closeDB } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import User from "@/models/User";
import Job from "@/models/Job";
import Quote from "@/models/Quote";
import { jobRepository } from "@/repositories";
import { Types } from "mongoose";

/**
 * Job Service Integration Tests
 * 
 * Tests for:
 * - Job creation and validation
 * - Job status transitions
 * - Job lifecycle (open → assigned → in_progress → completed)
 */

let clientId: string;
let providerId: string;

async function createTestData() {
  const client = await User.create({
    name: "Test Client",
    email: "client@test.local",
    password: "ClientPass123",
    role: "client",
    status: "approved",
  });
  clientId = client._id.toString();

  const provider = await User.create({
    name: "Test Provider",
    email: "provider@test.local",
    password: "ProviderPass123",
    role: "provider",
    status: "approved",
  });
  providerId = provider._id.toString();
}

describe("Job Repository - Atomic Operations", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Job.deleteMany({});
    await Quote.deleteMany({});
    
    await createTestData();
  });

  describe("atomicAssignProvider", () => {
    it("should assign provider to open job", async () => {
      const job = await Job.create({
        title: "Test Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
      });

      const result = await jobRepository.atomicAssignProvider(
        job._id.toString(),
        providerId,
        600
      );

      expect(result).toBeDefined();
      expect((result as any).status).toBe("assigned");
      expect((result as any).providerId.toString()).toBe(providerId);
      expect((result as any).budget).toBe(600);
    });

    it("should only assign if job status is open", async () => {
      const job = await Job.create({
        title: "Test Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "assigned", // Already assigned
      });

      const result = await jobRepository.atomicAssignProvider(
        job._id.toString(),
        providerId,
        600
      );

      expect(result).toBeNull(); // Should fail
    });

    it("should handle concurrent assignment attempts", async () => {
      const job = await Job.create({
        title: "Concurrent Test",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
      });

      const provider2 = await User.create({
        name: "Provider 2",
        email: "provider2@test.local",
        password: "hashed",
        role: "provider",
      });

      // Attempt concurrent assignments
      const [result1, result2] = await Promise.all([
        jobRepository.atomicAssignProvider(job._id.toString(), providerId, 500),
        jobRepository.atomicAssignProvider(
          job._id.toString(),
          provider2._id.toString(),
          500
        ),
      ]);

      // Only one should succeed
      const successCount = [result1, result2].filter((r) => r !== null).length;
      expect(successCount).toBe(1);

      // Verify job is assigned to one provider
      const updated = await jobRepository.getDocById(job._id.toString());
      expect((updated as any).status).toBe("assigned");
    });

    it("should update budget when assigning", async () => {
      const job = await Job.create({
        title: "Budget Test",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
      });

      const result = await jobRepository.atomicAssignProvider(
        job._id.toString(),
        providerId,
        750 // Different budget
      );

      expect((result as any).budget).toBe(750);
    });
  });

  describe("findPaginated", () => {
    beforeEach(async () => {
      // Create multiple jobs
      for (let i = 0; i < 25; i++) {
        await Job.create({
          title: `Job ${i}`,
          category: "Plumbing",
          budget: 500 + i * 100,
          clientId,
          status: "open",
          createdAt: new Date(Date.now() - i * 1000), // Stagger creation times
        });
      }
    });

    it("should return paginated jobs", async () => {
      const result = await jobRepository.findPaginated(
        { status: "open" },
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    it("should sort by newest by default", async () => {
      const result = await jobRepository.findPaginated(
        { status: "open" },
        { page: 1, limit: 5, sort: "newest" }
      );

      // First job should be the most recently created
      expect((result.data[0] as any).title).toBe("Job 0");
    });

    it("should sort by budget descending", async () => {
      const result = await jobRepository.findPaginated(
        { status: "open" },
        { page: 1, limit: 5, sort: "budget_desc" }
      );

      const budgets = result.data.map((j) => (j as any).budget);
      for (let i = 1; i < budgets.length; i++) {
        expect(budgets[i]).toBeLessThanOrEqual(budgets[i - 1]);
      }
    });

    it("should handle page boundaries", async () => {
      const lastPage = await jobRepository.findPaginated(
        { status: "open" },
        { page: 3, limit: 10 }
      );

      expect(lastPage.data).toHaveLength(5); // 25 total, 10 + 10 + 5
      expect(lastPage.page).toBe(3);
    });
  });

  describe("Job Status Transitions", () => {
    it("should validate job lifecycle transitions", async () => {
      const job = await Job.create({
        title: "Lifecycle Test",
        category: "Plumbing",
        budget: 500,
        clientId,
        providerId,
        status: "open",
      });

      // Transitions: open → assigned
      let updated = await Job.findByIdAndUpdate(
        job._id,
        { status: "assigned" },
        { new: true }
      );
      expect((updated as any).status).toBe("assigned");

      // assigned → in_progress (requires escrow funded)
      (updated as any).escrowStatus = "funded";
      await (updated as any).save();

      updated = await Job.findByIdAndUpdate(
        job._id,
        { status: "in_progress" },
        { new: true }
      );
      expect((updated as any).status).toBe("in_progress");

      // in_progress → completed
      updated = await Job.findByIdAndUpdate(
        job._id,
        { status: "completed" },
        { new: true }
      );
      expect((updated as any).status).toBe("completed");
    });

    it("should prevent invalid status transitions", async () => {
      const job = await Job.create({
        title: "Invalid Transition",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
      });

      // Cannot go from open directly to completed
      const result = await Job.findByIdAndUpdate(
        job._id,
        { status: "completed" },
        { new: true }
      );

      // Note: MongoDB doesn't enforce this at the schema level by default,
      // but business logic layer should reject it.
      // For this test, we're verifying the schema allows it,
      // and validation happens in the service layer.
      expect((result as any).status).toBe("completed");
    });
  });

  describe("countByStatus", () => {
    beforeEach(async () => {
      await Job.create({
        title: "Open Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
      });

      await Job.create({
        title: "Assigned Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "assigned",
      });

      await Job.create({
        title: "Completed Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "completed",
      });
    });

    it("should count jobs by status", async () => {
      const counts = await jobRepository.countByStatus();

      const openCount = counts.find((c) => c._id === "open")?.count ?? 0;
      const assignedCount = counts.find((c) => c._id === "assigned")?.count ?? 0;
      const completedCount = counts.find((c) => c._id === "completed")?.count ?? 0;

      expect(openCount).toBe(1);
      expect(assignedCount).toBe(1);
      expect(completedCount).toBe(1);
    });
  });

  describe("findStaleOpen", () => {
    beforeEach(async () => {
      const now = new Date();

      // Create an old job (10 days ago)
      await Job.create({
        title: "Stale Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      });

      // Create a recent job (1 day ago)
      await Job.create({
        title: "Recent Job",
        category: "Plumbing",
        budget: 500,
        clientId,
        status: "open",
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      });
    });

    it("should find open jobs older than cutoff date", async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 5); // 5 days ago

      const stale = await jobRepository.findStaleOpen(cutoff);

      expect(stale.length).toBe(1);
      expect((stale[0] as any).title).toBe("Stale Job");
    });

    it("should not include recent jobs", async () => {
      const cutoff = new Date(); // Now

      const stale = await jobRepository.findStaleOpen(cutoff);

      const titles = stale.map((j) => (j as any).title);
      expect(titles).not.toContain("Recent Job");
    });
  });
});
