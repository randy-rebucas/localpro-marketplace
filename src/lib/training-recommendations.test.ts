import { describe, it, expect } from "vitest";
import {
  inferTradeClusters,
  scoreCourseForProvider,
  buildTrainingRecommendations,
  type CatalogCourseInput,
  type ProviderPerformanceSnapshot,
} from "./training-recommendations";

function perf(p: Partial<ProviderPerformanceSnapshot>): ProviderPerformanceSnapshot {
  return {
    skillLabels: [],
    completedJobCount: 0,
    avgRating: 0,
    completionRate: 0,
    avgResponseTimeHours: 0,
    earnedBadgeSlugs: [],
    profileCertificationsCount: 0,
    ...p,
  };
}

describe("inferTradeClusters", () => {
  it("detects electrical from skills", () => {
    expect(inferTradeClusters(["Residential electrical wiring"])).toContain("electrical");
  });

  it("detects cleaning", () => {
    expect(inferTradeClusters(["Deep house cleaning"])).toContain("cleaning");
  });

  it("falls back to general_service", () => {
    expect(inferTradeClusters(["miscellaneous tasks"])).toEqual(["general_service"]);
  });
});

describe("scoreCourseForProvider", () => {
  const courseBase = (cat: CatalogCourseInput["category"]): CatalogCourseInput => ({
    _id: "c1",
    title: "Workplace Safety Basics",
    slug: "workplace-safety-basics",
    description: "Safety orientation for field providers",
    category: cat,
  });

  it("boosts safety courses when rating is weak", () => {
    const p = perf({ avgRating: 3.5 });
    const safety = scoreCourseForProvider(courseBase("safety"), "", p);
    const basic = scoreCourseForProvider(courseBase("basic"), "", p);
    expect(safety).toBeGreaterThan(basic);
  });

  it("deprioritizes completed enrollments", () => {
    const p = perf({});
    const done = scoreCourseForProvider(
      { ...courseBase("basic"), enrollmentStatus: "completed" },
      "cleaning",
      p
    );
    const open = scoreCourseForProvider(courseBase("basic"), "cleaning", p);
    expect(open).toBeGreaterThan(done);
  });
});

describe("buildTrainingRecommendations", () => {
  const catalog: CatalogCourseInput[] = [
    {
      _id: "a",
      title: "Electrical Safety on Site",
      slug: "electrical-safety",
      description: "Avoid shocks and code violations",
      category: "safety",
    },
    {
      _id: "b",
      title: "Introduction to Cleaning Business",
      slug: "cleaning-intro",
      description: "Book clients and manage schedules",
      category: "basic",
    },
  ];

  it("includes external TESDA-style pathways", () => {
    const out = buildTrainingRecommendations(
      perf({ skillLabels: ["Electrician"], completedJobCount: 20, avgRating: 4.8, completionRate: 90 }),
      catalog,
      2,
      3
    );
    expect(out.items.some((i) => i.source === "external")).toBe(true);
    expect(out.items.some((i) => i.externalUrl)).toBe(true);
  });

  it("prefers skill-relevant LocalPro courses", () => {
    const out = buildTrainingRecommendations(
      perf({ skillLabels: ["Electrical repair"], avgRating: 4.9, completionRate: 92 }),
      catalog,
      3,
      2
    );
    const firstLocal = out.items.find((i) => i.source === "localpro");
    expect(firstLocal?.courseId).toBe("a");
  });

  it("includes cpd message", () => {
    const out = buildTrainingRecommendations(perf({ skillLabels: ["cleaning"] }), catalog);
    expect(out.cpdMessage.toLowerCase()).toMatch(/continuous|development|upskill|professional/i);
  });
});
