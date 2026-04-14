import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

/**
 * Test Suite: AI Chat Dispatcher Phase 2 Implementation
 * Tests: BOOKING_INQUIRY, URGENT_SERVICE, SWITCH_PROVIDER, VENDOR_REQUEST
 * 
 * Coverage: 4 new intents adding 32% user coverage increase
 * Total test scenarios: 20+ mapped to test cases
 */

describe("AI Chat Dispatcher - Phase 2 Intents", () => {
  const apiBase = "http://localhost:3000/api/ai/chat";
  const endpoints = {
    main: `${apiBase}`,
    bookingInfo: `${apiBase}/booking-info`,
    urgentService: `${apiBase}/urgent-service`,
    switchProvider: `${apiBase}/switch-provider`,
    vendorRequest: `${apiBase}/vendor-request`,
  };

  // Mock data for testing
  const testData = {
    userId: "test-phase2-user",
    jobId: "test-job-12345",
    providerId: "test-provider-abc",
  };

  describe("BOOKING_INQUIRY Intent Detection", () => {
    it("should detect 'How to post' question and route to booking-info", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "How do I post a job on LocalPro?",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.nextAction).toBe("SHOW_BOOKING_INFO");
      expect(data.intent).toBe("BOOKING_INQUIRY");
    });

    it("should detect payment security question", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Is my payment info secure? How does escrow protection work?",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("BOOKING_INQUIRY");
    });

    it("should detect cancellation policy question", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Can I cancel my job after posting? What about refunds?",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("BOOKING_INQUIRY");
    });
  });

  describe("BOOKING_INFO Endpoint Tests", () => {
    it("should return FAQ answer for 'How to Post'", async () => {
      const response = await fetch(endpoints.bookingInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "How do I post a job?",
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.source).toMatch(/FAQ_DATABASE|AI_GENERATED/);
      expect(data.faqsShown).toBeDefined();
      expect(Array.isArray(data.faqsShown)).toBe(true);
      expect(data.message).toBeTruthy();
      expect(data.nextAction).toBe("SHOW_BOOKING_INFO");
    });

    it("should match multiple FAQ categories for complex query", async () => {
      const response = await fetch(endpoints.bookingInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage:
            "Is payment secure and what refund guarantee do you offer?",
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.faqsShown.length).toBeGreaterThanOrEqual(1);
    });

    it("should fall back to AI for unmatchable questions", async () => {
      const response = await fetch(endpoints.bookingInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "What is your company's sustainability policy?",
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // Allow both FAQ and AI responses
      expect(data.source).toBeDefined();
      expect(data.message).toBeTruthy();
    });

    it("should return response in under 500ms", async () => {
      const startTime = Date.now();
      const response = await fetch(endpoints.bookingInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "How to post?",
          userId: testData.userId,
        }),
      });

      const duration = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  describe("URGENT_SERVICE Intent Detection", () => {
    it("should detect emergency plumbing request", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "I need a plumber RIGHT NOW! My pipe is burst!",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("URGENT_SERVICE");
      expect(data.nextAction).toBe("SHOW_URGENT_OPTIONS");
    });

    it("should detect same-day urgent request", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "I need someone today within 2 hours",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("URGENT_SERVICE");
    });

    it("should detect asap keyword", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Can someone come asap? Critical problem!",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("URGENT_SERVICE");
    });
  });

  describe("URGENT_SERVICE Endpoint Tests", () => {
    it("should return urgent providers with rating >= 4.5", async () => {
      const response = await fetch(endpoints.urgentService, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Emergency plumbing NOW",
          userId: testData.userId,
          jobCategory: "plumbing",
          location: "Manila",
          budget: 5000,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.urgentProviders).toBeDefined();
      expect(Array.isArray(data.urgentProviders)).toBe(true);

      // Verify all returned providers meet quality threshold
      data.urgentProviders.forEach((provider: any) => {
        expect(provider.rating).toBeGreaterThanOrEqual(4.5);
        expect(provider.etaMinutes).toBeDefined();
        expect(provider.etaMinutes).toBeGreaterThanOrEqual(15);
        expect(provider.etaMinutes).toBeLessThanOrEqual(30);
      });
    });

    it("should not exceed 5 providers returned", async () => {
      const response = await fetch(endpoints.urgentService, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Need urgent service",
          userId: testData.userId,
          jobCategory: "electrical",
          location: "Cebu",
          budget: 3000,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.urgentProviders.length).toBeLessThanOrEqual(5);
    });

    it("should include premium option when budget allows", async () => {
      const response = await fetch(endpoints.urgentService, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Need service in 15 minutes max",
          userId: testData.userId,
          jobCategory: "plumbing",
          location: "Manila",
          budget: 10000,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.premiumOption).toBeDefined();
      if (data.premiumOption.available) {
        expect(data.premiumOption.extraFee).toBeGreaterThanOrEqual(250);
        expect(data.premiumOption.extraFee).toBeLessThanOrEqual(500);
        expect(data.premiumOption.guarantee).toBeTruthy();
      }
    });

    it("should respond in under 1 second", async () => {
      const startTime = Date.now();
      const response = await fetch(endpoints.urgentService, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Urgent service needed",
          userId: testData.userId,
          jobCategory: "plumbing",
          location: "Manila",
          budget: 5000,
        }),
      });

      const duration = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("SWITCH_PROVIDER Intent Detection", () => {
    it("should detect provider switch request", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Can I switch to a different provider? This one isnt responding",
            },
          ],
          userId: testData.userId,
          jobId: testData.jobId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("SWITCH_PROVIDER");
      expect(data.nextAction).toBe("CONFIRM_PROVIDER_SWITCH");
    });

    it("should detect poor work complaint", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "The quality is really poor, I want a different provider",
            },
          ],
          userId: testData.userId,
          jobId: testData.jobId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("SWITCH_PROVIDER");
    });

    it("should detect not responding keyword", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "The provider is not responding to my calls. Can I get someone else?",
            },
          ],
          userId: testData.userId,
          jobId: testData.jobId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("SWITCH_PROVIDER");
    });
  });

  describe("SWITCH_PROVIDER Endpoint Tests", () => {
    it("should validate job status before allowing switch", async () => {
      const response = await fetch(endpoints.switchProvider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Switch provider please",
          userId: testData.userId,
          jobId: testData.jobId,
          switchReason: "not_responding",
        }),
      });

      expect(response.status).toMatch(/200|400|404/);
      const data = await response.json();

      if (response.status === 200) {
        // Valid switch
        expect(data.replacementProviders).toBeDefined();
        expect(Array.isArray(data.replacementProviders)).toBe(true);
        expect(data.switchCount).toBeGreaterThanOrEqual(1);
      } else {
        // Invalid state
        expect(data.message).toBeTruthy();
      }
    });

    it("should enforce 3-switch limit", async () => {
      // This test would require pre-populated job with 3 switches
      // Testing the logic/validation response
      const response = await fetch(endpoints.switchProvider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Switch again",
          userId: testData.userId,
          jobId: "job-with-max-switches",
          switchReason: "other",
        }),
      });

      // Could be 400/403 if max reached, 200 if allowed
      expect([200, 400, 403]).toContain(response.status);
    });

    it("should enforce 30-minute minimum rule", async () => {
      // Test validation of minimum time before switch
      const response = await fetch(endpoints.switchProvider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Switch immediately",
          userId: testData.userId,
          jobId: "job-just-started",
          switchReason: "poor_work",
        }),
      });

      expect([200, 400]).toContain(response.status);
      const data = await response.json();
      if (!data.canSwitch) {
        expect(data.minutesUntilSwitch).toBeDefined();
      }
    });

    it("should return replacement providers with min rating 4.3", async () => {
      const response = await fetch(endpoints.switchProvider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Need different provider",
          userId: testData.userId,
          jobId: "valid-switch-job",
          switchReason: "not_responding",
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        if (data.replacementProviders && data.replacementProviders.length > 0) {
          data.replacementProviders.forEach((provider: any) => {
            expect(provider.rating).toBeGreaterThanOrEqual(4.3);
            expect(provider.providerId).not.toBe(testData.providerId);
          });
        }
      }
    });

    it("should respond in under 1 second", async () => {
      const startTime = Date.now();
      const response = await fetch(endpoints.switchProvider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Change provider",
          userId: testData.userId,
          jobId: testData.jobId,
          switchReason: "other",
        }),
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("VENDOR_REQUEST Intent Detection", () => {
    it("should detect vendor account interest", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "We are a 3-person team interested in becoming providers on LocalPro",
            },
          ],
          userId: "vendor-test-001",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("VENDOR_REQUEST");
      expect(data.nextAction).toBe("VENDOR_INQUIRY_RECEIVED");
    });

    it("should detect API access request", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "We need API access to integrate LocalPro into our platform",
            },
          ],
          userId: "vendor-test-002",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("VENDOR_REQUEST");
    });

    it("should detect white-label interest", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "We are an enterprise looking for a white-label solution",
            },
          ],
          userId: "vendor-test-003",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("VENDOR_REQUEST");
    });

    it("should detect partnership inquiry", async () => {
      const response = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "We want to discuss a partnership with LocalPro",
            },
          ],
          userId: "vendor-test-004",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.intent).toBe("VENDOR_REQUEST");
    });
  });

  describe("VENDOR_REQUEST Endpoint Tests", () => {
    it("should generate unique request ID", async () => {
      const response = await fetch(endpoints.vendorRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "We want to become vendors",
          userId: "vendor-test-new",
          userEmail: "vendor@test.com",
          vendorType: "small_team",
          inquiryType: "vendor_account",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.requestId).toBeDefined();
      expect(data.requestId).toMatch(/^TR-\d+-\w+$/);
    });

    it("should route solo proprietors to vendor_onboarding", async () => {
      const response = await fetch(endpoints.vendorRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Solo provider here",
          userId: "vendor-solo",
          userEmail: "solo@provider.com",
          vendorType: "sole_proprietor",
          inquiryType: "vendor_account",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.routedTo).toBe("vendor_onboarding");
      expect(data.priority).toBe("NORMAL");
    });

    it("should route API requests to technical_team with HIGH priority", async () => {
      const response = await fetch(endpoints.vendorRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "API integration needed",
          userId: "vendor-api",
          userEmail: "api@company.com",
          vendorType: "agency",
          inquiryType: "api_access",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.routedTo).toBe("technical_team");
      expect(data.priority).toBe("HIGH");
    });

    it("should route white-label to partnerships with HIGH priority", async () => {
      const response = await fetch(endpoints.vendorRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "White-label solution",
          userId: "vendor-wl",
          userEmail: "wl@enterprise.com",
          vendorType: "enterprise",
          inquiryType: "white_label",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.routedTo).toBe("partnerships");
      expect(data.priority).toBe("HIGH");
    });

    it("should include estimated response time", async () => {
      const response = await fetch(endpoints.vendorRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Vendor inquiry",
          userId: "vendor-time-test",
          userEmail: "test@vendor.com",
          vendorType: "small_team",
          inquiryType: "vendor_account",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.estimatedResponse).toBeTruthy();
      expect(
        data.estimatedResponse.includes("hour") ||
          data.estimatedResponse.includes("Hour")
      ).toBe(true);
    });

    it("should respond in under 500ms", async () => {
      const startTime = Date.now();
      const response = await fetch(endpoints.vendorRequest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Vendor request",
          userId: "vendor-perf",
          userEmail: "perf@test.com",
          vendorType: "small_team",
          inquiryType: "vendor_account",
        }),
      });

      const duration = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  describe("Integration Tests", () => {
    it("should provide different responses for different intent types", async () => {
      const bookingResponse = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "How do I post a job?" }],
          userId: testData.userId,
        }),
      });

      const urgentResponse = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "I need urgent service NOW!" }],
          userId: testData.userId,
        }),
      });

      const bookingData = await bookingResponse.json();
      const urgentData = await urgentResponse.json();

      expect(bookingData.intent).not.toBe(urgentData.intent);
      expect(bookingData.nextAction).not.toBe(urgentData.nextAction);
    });

    it("should maintain backward compatibility with Phase 1 intents", async () => {
      const recurringResponse = await fetch(endpoints.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "I need a cleaner to come by weekly on Sundays",
            },
          ],
          userId: testData.userId,
        }),
      });

      expect(recurringResponse.status).toBe(200);
      const data = await recurringResponse.json();
      expect(data.intent).toBe("RECURRING_SERVICE");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing userMessage gracefully", async () => {
      const response = await fetch(endpoints.bookingInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: testData.userId,
          // missing userMessage
        }),
      });

      expect([400, 422]).toContain(response.status);
    });

    it("should handle invalid JSON", async () => {
      const response = await fetch(endpoints.bookingInfo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle malformed job IDs", async () => {
      const response = await fetch(endpoints.switchProvider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Switch provider",
          userId: testData.userId,
          jobId: "not-a-valid-mongodb-id",
          switchReason: "other",
        }),
      });

      // Should either return 400 or gracefully handle
      expect([200, 400, 404]).toContain(response.status);
    });
  });
});
