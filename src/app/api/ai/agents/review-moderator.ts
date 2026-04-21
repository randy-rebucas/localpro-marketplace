/**
 * Review Moderation Agent
 * Flags suspicious and fake reviews to maintain marketplace integrity
 * POST /api/ai/agents/review-moderator
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ReviewModerationInput {
  reviewId: string;
  jobId: string;
  rating: number; // 1-5
  content: string;
  reviewerHistory: {
    totalReviews: number;
    averageRating: number;
    suspiciousFlags: number;
    accountAgeInDays: number;
  };
  targetHistory: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      fives: number;
      fours: number;
      threes: number;
      twos: number;
      ones: number;
    };
  };
  jobCompletion: {
    wasCompleted: boolean;
    completionDate: string;
    timeToReview: number; // days after completion
  };
}

interface ModerationDecision {
  status: "approved" | "flagged_for_review" | "rejected";
  confidence: number; // 0-100
  suspicionScore: number; // 0-100
  suspiciousIndicators: string[];
  recommendation: string;
  shouldNotify: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const input: ReviewModerationInput = await req.json();

    // Quick suspicious pattern checks
    const suspiciousPatterns: string[] = [];

    // Pattern 1: Same rating all the time
    if (
      input.reviewerHistory.totalReviews > 5 &&
      (input.reviewerHistory.averageRating === 5 || input.reviewerHistory.averageRating === 1)
    ) {
      suspiciousPatterns.push("Reviewer always gives same rating (bias indicator)");
    }

    // Pattern 2: Target is always perfect or always bad
    if (
      input.targetHistory.totalReviews > 10 &&
      (input.targetHistory.ratingDistribution.fives > input.targetHistory.totalReviews * 0.8 ||
        input.targetHistory.ratingDistribution.ones > input.targetHistory.totalReviews * 0.5)
    ) {
      suspiciousPatterns.push("Target has unusually extreme rating distribution");
    }

    // Pattern 3: Review same day as completion
    if (input.jobCompletion.timeToReview === 0 && input.rating === 5) {
      suspiciousPatterns.push("5-star review posted same day (possible self-review)");
    }

    // Pattern 4: Very new account
    if (input.reviewerHistory.accountAgeInDays < 7 && input.reviewerHistory.totalReviews === 1) {
      suspiciousPatterns.push("Brand new account with first review");
    }

    // Pattern 5: Conflicting with job rating
    if (
      input.targetHistory.averageRating >= 4.5 &&
      input.rating === 1 &&
      input.targetHistory.totalReviews > 50
    ) {
      suspiciousPatterns.push("1-star on highly-rated provider (outlier)");
    }

    const prompt = `You are a review moderation expert. Analyze this marketplace review for fraud.

Review Rating: ${input.rating}/5
Review Content: "${input.content}"

Reviewer Profile:
- Total Reviews: ${input.reviewerHistory.totalReviews}
- Average Rating Given: ${input.reviewerHistory.averageRating.toFixed(1)}
- Account Age: ${input.reviewerHistory.accountAgeInDays} days
- Previous Suspicious Flags: ${input.reviewerHistory.suspiciousFlags}

Target (Provider) Profile:
- Total Reviews: ${input.targetHistory.totalReviews}
- Average Rating: ${input.targetHistory.averageRating.toFixed(1)}
- Distribution: 5★: ${input.targetHistory.ratingDistribution.fives}, 4★: ${input.targetHistory.ratingDistribution.fours}, 3★: ${input.targetHistory.ratingDistribution.threes}, 2★: ${input.targetHistory.ratingDistribution.twos}, 1★: ${input.targetHistory.ratingDistribution.ones}

Review Timing: ${input.jobCompletion.timeToReview} days after completion
Job Completed: ${input.jobCompletion.wasCompleted}

Suspicious Patterns Found: ${suspiciousPatterns.join("; ") || "None"}

Fraud Indicators:
1. Review doesn't match provider history
2. Reviewer is serial abuser (always gives 5s or 1s)
3. Review posted too quickly (possible fake)
4. Inconsistent content (extreme language mismatch)
5. Low-effort review (too short for valid feedback)

Respond with JSON:
{
  "status": "approved|flagged_for_review|rejected",
  "confidence": <0-100>,
  "suspicionScore": <0-100>,
  "suspiciousIndicators": [<list>],
  "recommendation": "<action description>",
  "shouldNotify": <true/false>
}

Approval Rules:
- Legitimate-looking + confidence >= 80 → Approved
- Anything >= 50 suspicion → Flag for review
- Clear fraud indicators → Rejected`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a review moderation expert. Protect marketplace integrity. Be conservative with approvals. Return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const decision = JSON.parse(content) as ModerationDecision;

    // Apply pattern checks
    if (suspiciousPatterns.length > 0) {
      decision.suspicionScore = Math.max(decision.suspicionScore, 50 + suspiciousPatterns.length * 10);
      if (decision.status === "approved" && decision.suspicionScore > 50) {
        decision.status = "flagged_for_review";
      }
    }

    return NextResponse.json({
      success: true,
      decision: {
        ...decision,
        suspiciousIndicators: [...new Set([...decision.suspiciousIndicators, ...suspiciousPatterns])],
      },
    });
  } catch (error) {
    console.error("[Review Moderator] Error:", error);
    return NextResponse.json(
      { error: "Review moderation failed", details: String(error) },
      { status: 500 }
    );
  }
}
