import { test, expect, describe, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock connectDB
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock enqueueNotification
vi.mock("@/lib/notification-queue", () => ({
  enqueueNotification: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks are set up
import { POST } from "./route";

const mockRequest = (vendorData: any): any => {
  return {
    json: async () => ({
      vendorData,
      userEmail: "test@example.com",
    }),
  };
};

describe("Vendor Request Handler - Integration Tests", () => {
  describe("Lead Qualification Scoring", () => {
    test("Scenario 1: Sole proprietor salon requesting vendor_account should score STANDARD (35-50/100)", async () => {
      const request = mockRequest({
        businessName: "Maria's Beauty Salon",
        vendorType: "sole_proprietor",
        inquiryType: "vendor_account",
        message: "I want to register my salon and connect with freelance beauticians",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.leadScore.priority).toBe("standard");
      expect(json.leadScore.score).toBeGreaterThanOrEqual(35);
      expect(json.leadScore.score).toBeLessThanOrEqual(50);
      expect(json.leadScore.industry).toBe("Beauty & Personal Care");
      expect(json.leadScore.recommendedPlan).toBe("Starter");
      expect(json.estimatedResponse).toContain("24-48 hours");
    });

    test("Scenario 2: Small team restaurant with growth ambitions should score MEDIUM (55-75/100)", async () => {
      const request = mockRequest({
        businessName: "La Cucina Restaurant Group",
        vendorType: "small_team",
        inquiryType: "partnership",
        message:
          "We run 3 restaurants and want to scale to 10 locations. Need to manage housekeeping, maintenance, and food sourcing staff efficiently.",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.leadScore.priority).toBe("medium");
      expect(json.leadScore.score).toBeGreaterThanOrEqual(55);
      expect(json.leadScore.score).toBeLessThanOrEqual(75);
      expect(json.leadScore.industry).toBe("Food & Culinary");
      expect(json.leadScore.recommendedPlan).toBe("Growth");
      expect(json.leadScore.upsellOpportunities.length).toBeGreaterThan(0);
      expect(json.estimatedResponse).toContain("4-8 hours");
    });

    test("Scenario 3: Enterprise construction firm requesting white_label should score HIGH (75-100/100)", async () => {
      const request = mockRequest({
        businessName: "BuildCo Enterprise - National Construction",
        vendorType: "enterprise",
        inquiryType: "white_label",
        message:
          "We operate across 12 provinces and want to launch our own workforce platform under our brand. Need a full white-label solution.",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.leadScore.priority).toBe("high");
      expect(json.leadScore.score).toBeGreaterThanOrEqual(75);
      expect(json.leadScore.score).toBeLessThanOrEqual(100);
      expect(json.leadScore.industry).toBe("Construction & Infrastructure");
      expect(json.leadScore.recommendedPlan).toBe("Enterprise");
      expect(json.message).toContain("white-label");
    });

    test("Scenario 4: LGU requesting workforce registry should score HIGH (80-100/100)", async () => {
      const request = mockRequest({
        businessName: "City Government - Municipal PESO Office",
        vendorType: "agency",
        inquiryType: "partnership",
        message:
          "We aim to create a formal workforce registry for our PESO program, integrating with DOLE and TESDA. How can LocalPro help formalize our informal workforce?",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.leadScore.priority).toBe("high");
      expect(json.leadScore.score).toBeGreaterThanOrEqual(80);
      expect(json.leadScore.score).toBeLessThanOrEqual(100);
      expect(json.message).toContain("PESO");
      expect(json.leadScore.upsellOpportunities.some((opp: string) =>
        opp.includes("PESO")
      )).toBe(true);
    });

    test("Scenario 5: High-volume sole proprietor requesting API access should score MEDIUM (45-65/100)", async () => {
      const request = mockRequest({
        businessName: "TechStart Logistics Dispatcher",
        vendorType: "sole_proprietor",
        inquiryType: "api_access",
        message:
          "We manage thousands of deliveries per month. Need API access to integrate LocalPro providers into our dispatch system.",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.leadScore.priority).toBe("medium");
      expect(json.leadScore.score).toBeGreaterThanOrEqual(45);
      expect(json.leadScore.score).toBeLessThanOrEqual(65);
      expect(json.leadScore.industry).toBe("Transportation & Logistics");
    });
  });

  describe("Industry Detection Accuracy", () => {
    test("Should detect 'Beauty & Personal Care' from salon keywords", async () => {
      const request = mockRequest({
        businessName: "Salon & Spa Metro Manila",
        vendorType: "sole_proprietor",
        inquiryType: "vendor_account",
        message: "We offer hair, nails, and beauty aesthetics services",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.leadScore.industry).toBe("Beauty & Personal Care");
    });

    test("Should detect 'Hospitality' from hotel and event keywords", async () => {
      const request = mockRequest({
        businessName: "Grand Hotel & Events Venue",
        vendorType: "agency",
        inquiryType: "partnership",
        message:
          "We host 50+ events per month and need reliable housekeeping and catering staff",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.leadScore.industry).toBe("Hospitality");
    });

    test("Should detect 'IT & Technology' from software/tech keywords", async () => {
      const request = mockRequest({
        businessName: "CloudTech Solutions",
        vendorType: "enterprise",
        inquiryType: "api_access",
        message:
          "We build SaaS platforms and need to integrate local service providers via API",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.leadScore.industry).toBe("IT & Technology");
    });
  });

  describe("Routing & Team Assignment", () => {
    test("Should route vendor_account → vendor_onboarding team (STANDARD priority)", async () => {
      const request = mockRequest({
        businessName: "Single Provider",
        vendorType: "sole_proprietor",
        inquiryType: "vendor_account",
        message: "I want to join as a service provider",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.message).toContain("vendor onboarding");
      expect(json.estimatedResponse).toContain("24-48");
    });

    test("Should route partnership (small_team) → sales_team with MEDIUM priority", async () => {
      const request = mockRequest({
        businessName: "Growing Business",
        vendorType: "small_team",
        inquiryType: "partnership",
        message: "We want to partner with LocalPro",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.message).toContain("sales");
      expect(json.leadScore.priority).toBe("medium");
    });

    test("Should route api_access (enterprise) → technical_team with HIGH priority", async () => {
      const request = mockRequest({
        businessName: "Enterprise Tech",
        vendorType: "enterprise",
        inquiryType: "api_access",
        message: "Need API documentation",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.message).toContain("technical");
      expect(json.leadScore.priority).toBe("high");
      expect(json.estimatedResponse).toContain("2-4");
    });

    test("Should route white_label → partnerships team with HIGH priority", async () => {
      const request = mockRequest({
        businessName: "Regional Franchise",
        vendorType: "enterprise",
        inquiryType: "white_label",
        message: "Want white-label licensing",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.message).toContain("white-label");
      expect(json.leadScore.priority).toBe("high");
    });
  });

  describe("Response Quality & Actionability", () => {
    test("Should include next steps and contact expectations", async () => {
      const request = mockRequest({
        businessName: "Test Business",
        vendorType: "small_team",
        inquiryType: "partnership",
        message: "Partnership inquiry",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.message).toContain("What happens next:");
      expect(json.requestId).toMatch(/^TR-/);
      expect(json.estimatedResponse).toBeTruthy();
      expect(json.status).toBe("received");
    });

    test("Should include lead score in HIGH priority responses", async () => {
      const request = mockRequest({
        businessName: "Enterprise Partner",
        vendorType: "enterprise",
        inquiryType: "white_label",
        message: "White-label inquiry",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.message).toContain("Lead Qualification Score:");
      expect(json.message).toContain("/100");
    });
  });

  describe("Error Handling", () => {
    test("Should gracefully handle missing business name", async () => {
      const request = mockRequest({
        vendorType: "sole_proprietor",
        inquiryType: "vendor_account",
        message: "No business name provided",
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toContain("Thank you for your interest");
    });

    test("Should reject requests without vendorData", async () => {
      const invalidRequest = {
        json: async () => ({
          userEmail: "test@example.com",
        }),
      };

      const response = await POST(invalidRequest as any);

      expect(response.status).toBe(400);
    });
  });
});
