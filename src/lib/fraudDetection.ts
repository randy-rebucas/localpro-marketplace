/**
 * Fraud & Spam Detection Library
 *
 * Provides rule-based detection for:
 * - Spam / scam content in job postings
 * - Suspicious client behaviour patterns
 * - Identity-risk signals
 */

// ─── Spam keyword categories ───────────────────────────────────────────────────

/** Phrases that suggest the client wants to bypass the platform payment. */
const OFF_PLATFORM_PHRASES = [
  "pay outside",
  "pay directly",
  "cash only",
  "bypass escrow",
  "no escrow",
  "send to gcash",
  "send to paypal",
  "send to paymaya",
  "transfer directly",
  "pay upfront",
  "pay in advance",
  "direct transfer",
  "personal account",
  "send me money",
];

/** Phrases typical in job scams that promise unrealistic returns. */
const GET_RICH_PHRASES = [
  "earn big",
  "earn fast",
  "make money fast",
  "earn ₱",
  "earn php",
  "thousands per day",
  "passive income",
  "guaranteed income",
  "quick money",
  "instant cash",
  "online jobs",
  "work from home indefinitely",
  "invest now",
  "double your",
  "triple your",
  "no experience needed",
  "easy money",
  "unlimited earning",
];

/** Phrases that create artificial urgency to pressure providers. */
const PRESSURE_PHRASES = [
  "reply asap",
  "urgent urgent",
  "do it now",
  "limited slots",
  "first come first",
  "apply immediately",
  "respond or lose",
  "last chance",
  "hurry up",
  "slots are filling",
];

/** Potential data harvesting / phishing attempts. */
const PHISHING_PHRASES = [
  "send your id",
  "send your bank",
  "send your password",
  "click here",
  "bit.ly",
  "tinyurl",
  "t.me/",
  "telegram me",
  "whatsapp me",
  "send your ssn",
  "send your tin",
  "provide your credit",
  "give me your",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpamResult {
  flagged: boolean;
  score: number;           // 0-100; added directly to overall risk score
  reasons: string[];       // Human-readable flag descriptions
}

export interface BehaviourResult {
  suspicious: boolean;
  score: number;
  reasons: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\w\s₱]/g, " ");
}

function matchPhrases(text: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => text.includes(phrase));
}

// ─── Spam / Scam Detection ───────────────────────────────────────────────────

/**
 * Analyse a job title + description for spam / scam signals.
 * Returns a SpamResult with flag status, additive score, and reasons.
 */
export function detectSpam(title: string, description: string): SpamResult {
  const combined = normalise(`${title} ${description}`);
  const reasons: string[] = [];
  let score = 0;

  // Off-platform payment attempts (+20 each, capped)
  const offPlatform = matchPhrases(combined, OFF_PLATFORM_PHRASES);
  if (offPlatform.length > 0) {
    reasons.push(`Off-platform payment language detected: "${offPlatform[0]}"`);
    score += Math.min(offPlatform.length * 20, 40);
  }

  // Get-rich / unrealistic promises (+15 each, capped)
  const getRich = matchPhrases(combined, GET_RICH_PHRASES);
  if (getRich.length > 0) {
    reasons.push(`Suspicious earning promise: "${getRich[0]}"`);
    score += Math.min(getRich.length * 15, 30);
  }

  // Pressure tactics (+10 each, capped)
  const pressure = matchPhrases(combined, PRESSURE_PHRASES);
  if (pressure.length > 0) {
    reasons.push(`High-pressure language: "${pressure[0]}"`);
    score += Math.min(pressure.length * 10, 20);
  }

  // Phishing / data harvesting (+25 each, capped)
  const phishing = matchPhrases(combined, PHISHING_PHRASES);
  if (phishing.length > 0) {
    reasons.push(`Potential phishing / data harvesting: "${phishing[0]}"`);
    score += Math.min(phishing.length * 25, 50);
  }

  // Excessive repetition (same word used 5+ times) — copy-paste spam
  const words = combined.split(/\s+/).filter((w) => w.length > 3);
  const wordFreq: Record<string, number> = {};
  for (const w of words) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
  const repeatedWords = Object.entries(wordFreq).filter(([, c]) => c >= 5);
  if (repeatedWords.length > 0) {
    reasons.push(`Repetitive content detected (word "${repeatedWords[0][0]}" repeated ${repeatedWords[0][1]}x)`);
    score += 15;
  }

  // All-caps abuse — more than 40% uppercase is suspicious
  const upperRatio = (description.match(/[A-Z]/g)?.length ?? 0) / Math.max(description.length, 1);
  if (upperRatio > 0.4 && description.length > 30) {
    reasons.push("Excessive uppercase characters in description");
    score += 10;
  }

  return {
    flagged: score >= 15,
    score: Math.min(score, 60),
    reasons,
  };
}

// ─── Suspicious Client Behaviour ─────────────────────────────────────────────

export interface ClientBehaviourInput {
  /** Jobs posted by this client in the last 24 hours */
  jobsLast24h: number;
  /** Jobs posted by this client in the last 7 days */
  jobsLast7Days: number;
  /** How many of the client's past jobs were rejected by admin */
  rejectedJobCount: number;
  /** How many of the client's past jobs were flagged for fraud */
  flaggedJobCount: number;
  /** Whether the client has a verified email */
  isVerified: boolean;
  /** Whether the client's KYC is approved */
  kycApproved: boolean;
  /** Account age in days */
  accountAgeDays: number;
}

/**
 * Evaluate a client's behavioural risk signals.
 * Returns a BehaviourResult with suspicious flag, score, and reasons.
 */
export function evaluateClientBehaviour(input: ClientBehaviourInput): BehaviourResult {
  const reasons: string[] = [];
  let score = 0;

  // Velocity: too many jobs in 24h
  if (input.jobsLast24h >= 8) {
    reasons.push(`Excessive posting velocity: ${input.jobsLast24h} jobs in the last 24 hours`);
    score += 30;
  } else if (input.jobsLast24h >= 5) {
    reasons.push(`High posting velocity: ${input.jobsLast24h} jobs in the last 24 hours`);
    score += 15;
  }

  // Weekly velocity
  if (input.jobsLast7Days >= 30) {
    reasons.push(`Very high weekly volume: ${input.jobsLast7Days} jobs this week`);
    score += 20;
  }

  // History of rejected jobs
  if (input.rejectedJobCount >= 3) {
    reasons.push(`${input.rejectedJobCount} previously rejected jobs`);
    score += Math.min(input.rejectedJobCount * 8, 25);
  }

  // History of flagged (spam) jobs
  if (input.flaggedJobCount >= 2) {
    reasons.push(`${input.flaggedJobCount} previously spam-flagged jobs`);
    score += Math.min(input.flaggedJobCount * 10, 30);
  }

  // No email verification
  if (!input.isVerified) {
    reasons.push("Email address is not verified");
    score += 10;
  }

  // No KYC on a new account posting high volume
  if (!input.kycApproved && input.jobsLast7Days >= 3) {
    reasons.push("Unverified identity (KYC not approved) posting multiple jobs");
    score += 10;
  }

  // Very new account posting jobs (< 1 day old)
  if (input.accountAgeDays < 1) {
    reasons.push("Account created less than 1 day ago");
    score += 15;
  } else if (input.accountAgeDays < 3) {
    reasons.push(`Very new account (${input.accountAgeDays} days old)`);
    score += 8;
  }

  return {
    suspicious: score >= 20,
    score: Math.min(score, 60),
    reasons,
  };
}
