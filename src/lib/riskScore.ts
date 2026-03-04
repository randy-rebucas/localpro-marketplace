import type { IJob } from "@/types";
import { detectSpam, evaluateClientBehaviour, type ClientBehaviourInput } from "@/lib/fraudDetection";

const HIGH_RISK_CATEGORIES = ["electrical", "plumbing", "roofing", "gas"];
const HIGH_BUDGET_THRESHOLD = 5000;

export interface RiskAssessment {
  score: number;
  fraudFlags: string[];
}

/**
 * Comprehensive risk assessment for a job posting.
 * Combines content-based signals, budget/category signals, and optional
 * client-behaviour context into a single 0–100 risk score plus fraud flags.
 *
 * @param job        - Job fields being submitted
 * @param behaviour  - Optional pre-computed client behaviour input
 */
export function assessJobRisk(
  job: Partial<IJob>,
  behaviour?: ClientBehaviourInput
): RiskAssessment {
  const fraudFlags: string[] = [];
  let score = 0;

  // ── 1. Spam / content detection ──────────────────────────────────────────
  const spam = detectSpam(
    (job.title as string) ?? "",
    (job.description as string) ?? ""
  );
  if (spam.flagged) {
    score += spam.score;
    fraudFlags.push(...spam.reasons);
  }

  // ── 2. Budget risk factor ─────────────────────────────────────────────────
  if (job.budget && job.budget > HIGH_BUDGET_THRESHOLD) {
    score += 20;
  } else if (job.budget && job.budget > 1000) {
    score += 10;
  }

  // ── 3. Category risk factor ───────────────────────────────────────────────
  if (
    job.category &&
    HIGH_RISK_CATEGORIES.includes(job.category.toLowerCase())
  ) {
    score += 15;
    fraudFlags.push(`High-risk service category: ${job.category}`);
  }

  // ── 4. Description completeness (short = riskier) ────────────────────────
  if (job.description && job.description.length < 50) {
    score += 15;
    fraudFlags.push("Very short job description");
  }

  // ── 5. Schedule urgency (within 24 hours = higher risk) ──────────────────
  if (job.scheduleDate) {
    const hoursUntil =
      (new Date(job.scheduleDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      score += 20;
      fraudFlags.push("Scheduled within 24 hours (extreme urgency)");
    } else if (hoursUntil < 48) {
      score += 10;
    }
  }

  // ── 6. Client behaviour signals ───────────────────────────────────────────
  if (behaviour) {
    const beh = evaluateClientBehaviour(behaviour);
    if (beh.suspicious) {
      score += beh.score;
      fraudFlags.push(...beh.reasons);
    }
  }

  return {
    score: Math.min(score, 100),
    fraudFlags,
  };
}

/**
 * @deprecated Use `assessJobRisk` for full assessment with fraud flags.
 * Kept for backward-compatibility with existing callers.
 */
export function calculateRiskScore(job: Partial<IJob>): number {
  return assessJobRisk(job).score;
}
