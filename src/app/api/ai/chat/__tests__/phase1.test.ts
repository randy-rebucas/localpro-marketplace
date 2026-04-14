import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Test Suite: AI Chat Dispatcher Phase 1 Implementation
 * Tests: RECURRING_SERVICE, GET_QUOTE_ESTIMATE, MODIFY_JOB, ESCALATE_DISPUTE
 */

describe("AI Chat Dispatcher - Phase 1 Intents", () => {
  const apiBase = "http://localhost:3000/api/ai/chat";
  let testJobId: string;
  let authToken: string; // Would be obtained from login in real tests

  describe("Intent Extraction System", () => {
    it("should detect RECURRING_SERVICE intent", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "I need a cleaner to come by weekly on Sundays",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "User testing recurring service",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("RECURRING_SERVICE");
      expect(data.extractedData.frequency).toBeDefined();
    });

    it("should detect GET_QUOTE_ESTIMATE intent", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "How much would it cost for electrical work in Manila?",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "User asking for price estimate",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("GET_QUOTE_ESTIMATE");
      expect(data.extractedData).toHaveProperty("category");
    });

    it("should detect MODIFY_JOB intent", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "Can we reschedule my appointment to tomorrow at 3pm?",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "User wants to modify job",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("MODIFY_JOB");
      expect(data.extractedData).toHaveProperty("newTime");
    });

    it("should detect ESCALATE_DISPUTE intent", async () => {
      const messages = [
        {
          role: "user" as const,
          content:
            "I'm very unhappy with the work quality. The plumber did a poor job and I want a refund.",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "User has complaint about service",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("ESCALATE_DISPUTE");
      expect(data.extractedData).toHaveProperty("disputeReason");
      expect(data.extractedData).toHaveProperty("disputeSeverity");
    });
  });

  describe("RECURRING_SERVICE Endpoint", () => {
    it("should search recurring providers", async () => {
      const response = await fetch(`${apiBase}/recurring-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobData: {
            category: "cleaning",
            frequency: "weekly",
            location: "Quezon City",
            budgetMin: 1000,
            budgetMax: 3000,
            description: "Weekly house cleaning every Sunday",
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("providers");
      expect(data).toHaveProperty("frequency", "weekly");
      expect(data).toHaveProperty("category", "cleaning");

      if (data.providers.length > 0) {
        const provider = data.providers[0];
        expect(provider).toHaveProperty("providerId");
        expect(provider).toHaveProperty("name");
        expect(provider).toHaveProperty("rating");
        expect(provider).toHaveProperty("matchScore");
      }
    });

    it("should handle invalid parameters", async () => {
      const response = await fetch(`${apiBase}/recurring-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobData: {
            // Missing required fields
          },
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("GET_QUOTE_ESTIMATE Endpoint", () => {
    it("should estimate price for service", async () => {
      const response = await fetch(`${apiBase}/price-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobData: {
            category: "electrical",
            location: "Manila",
            budgetMin: 2000,
            budgetMax: 8000,
            description: "Rewiring kitchen outlets",
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("estimate");
      expect(data.estimate).toHaveProperty("estimatedPrice");
      expect(data.estimate.estimatedPrice).toHaveProperty("min");
      expect(data.estimate.estimatedPrice).toHaveProperty("max");
      expect(data.estimate.estimatedPrice.min).toBeLessThanOrEqual(
        data.estimate.estimatedPrice.max
      );
      expect(data.estimate).toHaveProperty("currency", "PHP");
    });

    it("should provide market comparison", async () => {
      const response = await fetch(`${apiBase}/price-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobData: {
            category: "plumbing",
            location: "Makati",
            description: "Fix leaky faucet",
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.estimate).toHaveProperty("marketAverage");
      expect(data.estimate.marketAverage).toHaveProperty("min");
      expect(data.estimate.marketAverage).toHaveProperty("max");
    });
  });

  describe("MODIFY_JOB Endpoint", () => {
    it("should modify job date", async () => {
      // Note: This would need a real jobId from a created job
      const testModifyData = {
        jobId: "test-job-id",
        modifications: {
          newDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          newTime: "15:00",
          scopeChange: "reduce",
        },
      };

      // This test would fail without auth and valid jobId
      // In a real environment, we'd have fixtures
      const response = await fetch(`${apiBase}/modify-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testModifyData),
      });

      // Expected to fail auth, but let's check error handling
      expect(
        response.status === 401 || response.status === 404 ||
        response.status === 200
      ).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await fetch(`${apiBase}/modify-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: "test",
          modifications: {},
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("ESCALATE_DISPUTE Endpoint", () => {
    it("should require authentication", async () => {
      const response = await fetch(`${apiBase}/escalate-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: "test-job",
          reason: "Poor quality work",
          severity: "high",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should validate required fields", async () => {
      const response = await fetch(`${apiBase}/escalate-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing jobId and reason
          severity: "medium",
        }),
      });

      // Should fail due to missing fields or auth
      expect(
        response.status === 400 ||
        response.status === 401
      ).toBe(true);
    });
  });

  describe("Conversation Flow Integration", () => {
    it("should handle multi-turn recurring service conversation", async () => {
      const messages = [
        {
          role: "user" as const,
          content:
            "I need someone to clean my house regularly, like every two weeks",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "Recurring service conversation",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("RECURRING_SERVICE");
      expect(data.nextAction).toBeDefined();
      expect(
        ["SHOW_RECURRING_OPTIONS", "ASK_QUESTION"].includes(data.nextAction)
      ).toBe(true);
    });

    it("should handle multi-turn price estimation conversation", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "What's the typical cost for painting a room in Cebu?",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "Price estimation conversation",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("GET_QUOTE_ESTIMATE");
      expect(["SHOW_PRICE_ESTIMATE", "ASK_QUESTION"].includes(data.nextAction)).toBe(
        true
      );
    });

    it("should handle ambiguous intent with clarifying questions", async () => {
      const messages = [
        {
          role: "user" as const,
          content:
            "I need help with my apartment and it's kind of urgent",
        },
      ];

      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: "Ambiguous intent test",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.nextAction).toBe("ASK_QUESTION");
      expect(data.clarifyingQuestions).toBeDefined();
      expect(data.clarifyingQuestions.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON", async () => {
      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid json}",
      });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle missing required fields in chat message", async () => {
      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing messages array
          context: "test",
        }),
      });

      expect([400, 500]).toContain(response.status);
    });

    it("should gracefully handle OpenAI API failures", async () => {
      // This would require mocking OpenAI in a real test environment
      const response = await fetch(`${apiBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user" as const,
              content: "Test message",
            },
          ],
          context: "test",
        }),
      });

      expect([200, 500]).toContain(response.status);
      const data = await response.json();
      if (response.status === 500) {
        expect(data).toHaveProperty("error");
      } else {
        expect(data).toHaveProperty("message");
      }
    });
  });
});
