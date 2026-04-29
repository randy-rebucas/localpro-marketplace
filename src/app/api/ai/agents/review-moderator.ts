/**
 * Review Moderation Agent
 * Flags suspicious and fake reviews to maintain marketplace integrity
 * POST /api/ai/agents/review-moderator
 * Internal endpoint — requires INTERNAL_API_KEY bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface ReviewModerationInput {
  reviewId: string;
  jobId: string;
  rating: number;
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
    ratingDistribution: { fives: number; fours: number; threes: number; twos: number; ones: number };
  };
  jobCompletion: {
    wasCompleted: boolean;
    completionDate: string;
    timeToReview: number;
  };
}

export const POST = withHandler(async (req: NextRequest) => {
  const internalKey = process.env.INTERNAL_API_KEY;
  const auth = req.headers.get("authorization");
  if (!internalKey || auth !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const input: ReviewModerationInput = await req.json();

  const suspiciousPatterns: string[] = [];
  if (input.reviewerHistory.totalReviews > 5 && (input.reviewerHistory.averageRating === 5 || input.reviewerHistory.averageRating === 1)) {
    suspiciousPatterns.push("Reviewer always gives same rating (bias indicator)");
  }
  if (input.targetHistory.totalReviews > 10 && (input.targetHistory.ratingDistribution.fives > input.targetHistory.totalReviews * 0.8 || input.targetHistory.ratingDistribution.ones > input.targetHistory.totalReviews * 0.5)) {
    suspiciousPatterns.push("Target has unusually extreme rating distribution");
  }
  if (input.jobCompletion.timeToReview === 0 && input.rating === 5) {
    suspiciousPatterns.push("5-star review posted same day (possible self-review)");
  }
  if (input.reviewerHistory.accountAgeInDays < 7 && input.reviewerHistory.totalReviews === 1) {
    suspiciousPatterns.push("Brand new account with first review");
  }
  if (input.targetHistory.averageRating >= 4.5 && input.rating === 1 && input.targetHistory.totalReviews > 50) {
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
Suspicious Patterns Found: ${suspiciousPatterns.join("; ") || "None"}

Respond with JSON:
{
  "status": "approved|flagged_for_review|rejected",
  "confidence": <0-100>,
  "suspicionScore": <0-100>,
  "suspiciousIndicators": [<list>],
  "recommendation": "<action description>",
  "shouldNotify": <true/false>
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a review moderation expert. Protect marketplace integrity. Be conservative with approvals. Return valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const decision = JSON.parse(content);

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
});
