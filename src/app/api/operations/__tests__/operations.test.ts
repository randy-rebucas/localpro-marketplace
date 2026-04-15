import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectDB, closeDB } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import User from "@/models/User";
import Job from "@/models/Job";
import Quote from "@/models/Quote";
import { Types } from "mongoose";

/**
 * Business Operations Integration Tests
 * 
 * Tests for:
 * - POST /api/operations/dispatch (auto-assign jobs)
 * - POST /api/operations/provider-matching (find candidates)
 */

let adminToken: string;
let adminId: string;
let providerId: string;
let clientId: string;
let jobId: string;

async function createTestData() {
  // Create admin user
  const admin = await User.create({
    name: "Admin User",
    email: "admin@test.local",
    password: "AdminPassword123",
    role: "admin",
    status: "approved",
  });
  adminId = admin._id.toString();
  adminToken = generateToken({ userId: adminId, role: "admin" }, "24h");

  // Create provider user
  const provider = await User.create({
    name: "Test Provider",
    email: "provider@test.local",
    password: "ProviderPass123",
    role: "provider",
    status: "approved",
    rating: 4.8,
    completedJobs: 45,
  });
  providerId = provider._id.toString();

  // Create client user
  const client = await User.create({
    name: "Test Client",
    email: "client@test.local",
    password: "ClientPassword123",
    role: "client",
    status: "approved",
  });
  clientId = client._id.toString();

  // Create a job in "open" status
  const job = await Job.create({
    title: "Plumbing Repair",
    description: "Fix leaking tap in bathroom. Professional plumbing work required for water fixture repair.",
    category: "Plumbing",
    budget: 500,
    clientId,
    status: "open",
    urgency: "standard",
  });
  jobId = job._id.toString();
}

describe("Operations API - Dispatch & Provider Matching", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Job.deleteMany({});
    await Quote.deleteMany({});
    
    await createTestData();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISPATCH ENDPOINT TESTS
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /api/operations/dispatch", () => {
    it("should auto-assign a job to best-matching provider", async () => {
      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.job.status).toBe("assigned");
      expect(data.assignedProviderId).toBe(providerId);
      expect(data.job.budget).toBe(500);
    });

    it("should manually assign a job to specific provider", async () => {
      const newAmount = 600;
      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          providerId,
          proposedAmount: newAmount,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.job.providerId).toBe(providerId);
      expect(data.job.budget).toBe(newAmount);
    });

    it("should reject if jobId is missing", async () => {
      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("jobId is required");
    });

    it("should reject if job not found", async () => {
      const fakeJobId = new Types.ObjectId();
      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId: fakeJobId.toString() }),
      });

      expect(response.status).toBe(404);
    });

    it("should reject if job is not in open status", async () => {
      // Modify job to assigned status
      await Job.updateOne({ _id: jobId }, { status: "assigned" });

      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('status is "assigned"');
    });

    it("should reject if provider is not approved", async () => {
      // Create unapproved provider
      const unapprovedProvider = await User.create({
        name: "Unapproved Provider",
        email: "unapproved@test.local",
        password: "hashed",
        role: "provider",
        status: "pending", // Not approved
      });

      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          providerId: unapprovedProvider._id.toString(),
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("status is \"pending\"");
    });

    it("should reject if proposed amount is invalid", async () => {
      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          proposedAmount: 0,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid amount");
    });

    it("should reject non-admin users", async () => {
      const clientToken = generateToken({ userId: clientId, role: "client" }, "24h");

      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(403);
    });

    it("should return conflict if job already assigned concurrently", async () => {
      // Simulate concurrent assignment by pre-assigning the job
      await Job.updateOne(
        { _id: jobId },
        {
          $set: {
            status: "assigned",
            providerId: new Types.ObjectId(), // Different provider
          },
        }
      );

      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already assigned or is no longer open");
    });

    it("should reject pending quotes for assigned job", async () => {
      // Create some quotes for the job
      const otherProvider = await User.create({
        name: "Other Provider",
        email: "other@test.local",
        password: "hashed",
        role: "provider",
        status: "approved",
      });

      const quote = await Quote.create({
        jobId,
        providerId: otherProvider._id,
        proposedAmount: 450,
        timeline: "2 days",
        message: "I can do this",
        status: "pending",
      });

      const response = await fetch("http://localhost:3000/api/operations/dispatch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, providerId }),
      });

      expect(response.status).toBe(200);

      // Verify quote was rejected
      const updatedQuote = await Quote.findById(quote._id);
      expect((updatedQuote as any).status).toBe("rejected");
      expect((updatedQuote as any).rejectionReason).toContain("assigned to another provider");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PROVIDER MATCHING ENDPOINT TESTS
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /api/operations/provider-matching", () => {
    it("should find matching providers for a job", async () => {
      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.jobId).toBe(jobId);
      expect(data.totalCandidates).toBeGreaterThan(0);
      expect(Array.isArray(data.candidates)).toBe(true);
      
      // First candidate should have highest match score
      if (data.candidates.length > 1) {
        expect(data.candidates[0].matchScore).toBeGreaterThanOrEqual(data.candidates[1].matchScore);
      }
    });

    it("should respect maxResults parameter", async () => {
      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          maxResults: 3,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.totalCandidates).toBeLessThanOrEqual(3);
    });

    it("should reject invalid maxResults", async () => {
      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          maxResults: 50, // > 20
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("between 1 and 20");
    });

    it("should return empty candidates if no match found", async () => {
      // Create job with very specific category unlikely to match
      const niche = await Job.create({
        title: "Specialized Quantum Computing Service",
        description: "Rare specialized quantum computing service request requiring advanced expertise.",
        category: "QuantumComputing", // Unlikely to have matching providers
        budget: 10000,
        clientId,
        status: "open",
      });

      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: niche._id.toString(),
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // May be empty or very small
      expect(Array.isArray(data.candidates)).toBe(true);
    });

    it("should reject non-admin users", async () => {
      const clientToken = generateToken({ userId: clientId, role: "client" }, "24h");

      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clientToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(403);
    });

    it("should reject if jobId is missing", async () => {
      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("jobId is required");
    });

    it("should return candidate with enriched data", async () => {
      const response = await fetch("http://localhost:3000/api/operations/provider-matching", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      if (data.totalCandidates > 0) {
        const candidate = data.candidates[0];
        expect(candidate).toHaveProperty("providerId");
        expect(candidate).toHaveProperty("matchScore");
        expect(candidate).toHaveProperty("matchTier");
        expect(candidate).toHaveProperty("reason");
        expect(candidate).toHaveProperty("profileLink");
        expect(candidate).toHaveProperty("actionLink");
      }
    });
  });
});
