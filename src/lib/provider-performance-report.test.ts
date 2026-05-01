import { describe, expect, it } from "vitest";
import {
  buildProviderPerformanceReport,
  buildRecommendations,
  truncateFeedbackExcerpt,
  type ProviderPerformanceReportInput,
} from "@/lib/provider-performance-report";
import { getProviderTier } from "@/lib/tier";

function baseInput(over: Partial<ProviderPerformanceReportInput> = {}): ProviderPerformanceReportInput {
  return {
    completedJobCount: 20,
    completionRate: 85,
    avgResponseTimeHours: 2,
    avgRating: 4.5,
    reviewCount: 12,
    breakdown: {
      quality: 4.5,
      professionalism: 4.5,
      punctuality: 4.5,
      communication: 4.5,
      count: 8,
    },
    fiveStarStreak: 0,
    recentFeedback: [],
    ...over,
  };
}

describe("truncateFeedbackExcerpt", () => {
  it("collapses whitespace and truncates with ellipsis", () => {
    const long = "a ".repeat(80).trim();
    const out = truncateFeedbackExcerpt(long, 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });
});

describe("buildRecommendations via report", () => {
  it("adds completion improvement when completion below 70% with jobs", () => {
    const input = baseInput({ completionRate: 60, completedJobCount: 5 });
    const report = buildProviderPerformanceReport(input);
    const titles = report.recommendations.filter((r) => r.type === "improvement").map((r) => r.title);
    expect(titles.some((t) => t.includes("completion"))).toBe(true);
  });

  it("adds recognition for Gold tier with streak >= 3", () => {
    const input = baseInput({
      completedJobCount: 35,
      avgRating: 4.6,
      completionRate: 88,
      fiveStarStreak: 4,
      breakdown: { quality: 5, professionalism: 5, punctuality: 5, communication: 5, count: 10 },
    });
    const report = buildProviderPerformanceReport(input);
    expect(report.tier.tier).toBe("gold");
    expect(report.recommendations.some((r) => r.title.includes("five-star streak"))).toBe(true);
  });

  it("adds Elite recognition for elite tier", () => {
    const input = baseInput({
      completedJobCount: 80,
      avgRating: 4.9,
      completionRate: 92,
      fiveStarStreak: 0,
      breakdown: { quality: 5, professionalism: 5, punctuality: 5, communication: 5, count: 20 },
    });
    const report = buildProviderPerformanceReport(input);
    expect(report.tier.tier).toBe("elite");
    expect(report.recommendations.some((r) => r.title.includes("Elite"))).toBe(true);
  });
});

describe("null breakdown handling", () => {
  it("sets punctuality metrics null and surfaces summary note path", () => {
    const input = baseInput({
      breakdown: null,
      reviewCount: 5,
      avgRating: 4.2,
      avgResponseTimeHours: 30,
    });
    const report = buildProviderPerformanceReport(input);
    expect(report.metrics.punctualityAverage).toBeNull();
    expect(report.metrics.punctualityNote).toContain("not enough dimensional");
    expect(report.metrics.responsivenessNote).toBeTruthy();
    expect(report.summaryOneLiner.toLowerCase()).toContain("punctuality");
  });

  it("suggests faster quotes when breakdown missing and response hours high", () => {
    const input = baseInput({
      breakdown: null,
      avgResponseTimeHours: 48,
      reviewCount: 3,
    });
    const tier = getProviderTier(input.completedJobCount, input.avgRating, input.completionRate);
    const recs = buildRecommendations(input, tier);
    expect(recs.some((r) => r.title.includes("quote responses"))).toBe(true);
  });
});

describe("buildProviderPerformanceReport summary", () => {
  it("mentions reviews or dimensional insights when no reviews but jobs exist", () => {
    const input = baseInput({ reviewCount: 0, completedJobCount: 4, avgRating: 0 });
    const report = buildProviderPerformanceReport(input);
    expect(report.summaryOneLiner.toLowerCase()).toMatch(/review|unlock|dimensional/);
  });
});
