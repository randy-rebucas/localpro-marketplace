import type { IJob } from "@/types";

const HIGH_RISK_CATEGORIES = ["electrical", "plumbing", "roofing", "gas"];
const HIGH_BUDGET_THRESHOLD = 5000;

/**
 * Placeholder risk scoring logic.
 * In production, this would use ML models or fraud-detection services.
 * Returns a score 0–100 (higher = riskier).
 */
export function calculateRiskScore(job: Partial<IJob>): number {
  let score = 0;

  // Budget risk factor
  if (job.budget && job.budget > HIGH_BUDGET_THRESHOLD) {
    score += 30;
  } else if (job.budget && job.budget > 1000) {
    score += 15;
  }

  // Category risk factor
  if (
    job.category &&
    HIGH_RISK_CATEGORIES.includes(job.category.toLowerCase())
  ) {
    score += 25;
  }

  // Description length as completeness signal (inverse — short = riskier)
  if (job.description && job.description.length < 50) {
    score += 20;
  }

  // Schedule urgency (within 48 hours)
  if (job.scheduleDate) {
    const hoursUntil =
      (new Date(job.scheduleDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 48) {
      score += 25;
    }
  }

  return Math.min(score, 100);
}
