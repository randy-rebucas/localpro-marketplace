import { describe, expect, it } from "vitest";
import {
  buildProviderPerformanceEvidenceLines,
  isSuspendedAuthMessage,
} from "@/lib/disciplinary-notice";

describe("isSuspendedAuthMessage", () => {
  it("detects suspension wording", () => {
    expect(isSuspendedAuthMessage("Your account has been suspended.")).toBe(true);
    expect(isSuspendedAuthMessage("Account suspended")).toBe(true);
    expect(isSuspendedAuthMessage("Invalid email or password")).toBe(false);
  });
});

describe("buildProviderPerformanceEvidenceLines", () => {
  it("returns rating lines when trigger is rating", () => {
    const lines = buildProviderPerformanceEvidenceLines({
      avgRating: 3.0,
      reviewCount: 4,
      completionRate: 90,
      completedJobCount: 10,
      trigger: "rating",
    });
    expect(lines.some((l) => l.includes("3.0"))).toBe(true);
    expect(lines.some((l) => l.includes("3.5"))).toBe(true);
  });

  it("returns completion lines when trigger is completion", () => {
    const lines = buildProviderPerformanceEvidenceLines({
      avgRating: 5,
      reviewCount: 1,
      completionRate: 50,
      completedJobCount: 8,
      trigger: "completion",
    });
    expect(lines.some((l) => l.includes("50%"))).toBe(true);
    expect(lines.some((l) => l.includes("70%"))).toBe(true);
  });
});
