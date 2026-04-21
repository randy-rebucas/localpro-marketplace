/**
 * Support Agent Handler
 * Handles first-line customer support, FAQ resolution, and ticket triage
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";
import { enqueueNotification } from "@/lib/notification-queue";
import mongoose from "mongoose";

interface SupportQueryInput {
  ticketId?: string;
  userId?: string;
  message: string;
  category?: string;
  previousMessages?: string[];
}

interface SupportAgentResponse {
  decision: {
    shouldResolveDirectly: boolean;
    responseType: "resolution" | "escalation" | "clarification";
    confidence: number;
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  response: string;
  actionItems?: {
    escalateToSupport: boolean;
    escalationReason?: string;
    suggestedCategory?: string;
    sentiment?: "positive" | "neutral" | "negative";
    sentimentScore?: number;
  };
}

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Analyze customer sentiment and detect escalation needs
 */
async function analyzeSentimentAndContext(message: string, client: OpenAI): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  needsEscalation: boolean;
  reason?: string;
}> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at detecting customer sentiment and support urgency. 
          Analyze the message and return a JSON object with:
          - sentiment: "positive", "neutral", or "negative"
          - sentimentScore: 0-1 (0=very negative, 1=very positive)
          - needsEscalation: boolean (true if customer seems upset, mentions loss, legal threat, etc)
          - reason: string explaining why escalation needed`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      sentiment: result.sentiment || "neutral",
      sentimentScore: result.sentimentScore || 0.5,
      needsEscalation: result.needsEscalation || false,
      reason: result.reason,
    };
  } catch (err) {
    console.error("[analyzeSentimentAndContext] error:", err);
    return {
      sentiment: "neutral",
      sentimentScore: 0.5,
      needsEscalation: false,
    };
  }
}

/**
 * Generate support response using AI
 */
async function generateSupportResponse(
  input: SupportQueryInput,
  client: OpenAI
): Promise<SupportAgentResponse> {
  const sentiment = await analyzeSentimentAndContext(input.message, client);

  // Build context for the AI
  const context = `You are LocalPro's Support Agent. Your role is to:
1. Provide helpful, empathetic first-line support
2. Resolve common issues (payment problems, quote questions, job status)
3. Collect information for tickets that need escalation
4. Detect customer frustration and recommend escalation

Common resolution patterns:
- Payment issue? Explain PayMongo/GCash status, refund process
- Quote question? Explain how providers create quotes, revision process
- Job status? Explain current status, typical timelines
- Dispute? Explain escalation process, evidence requirements
- Booking? Explain job posting, provider matching, escrow protection

IMPORTANT GUARDRAILS:
- DO NOT apologize on behalf of the company unless customer lost money
- DO NOT admit liability or make promises you can't keep
- DO escalate if: customer is upset (sentiment negative), financial loss mentioned, legal threat
- DO keep responses friendly, professional, under 300 words
- DO ask clarifying questions if information is incomplete`;

  const previousContext =
    (input.previousMessages?.length ?? 0) > 0
      ? `Previous messages:\n${input.previousMessages!.join("\n")}\n\n`
      : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: context },
      {
        role: "user",
        content: `${previousContext}Customer message (category: ${input.category || "general"}):
"${input.message}"

Sentiment analysis: ${sentiment.sentiment} (score: ${sentiment.sentimentScore})
Need escalation: ${sentiment.needsEscalation}

Generate a response that either:
1. Resolves the issue directly (if it's a common FAQ-type question)
2. Escalates with context (if unclear or customer upset)
3. Asks clarifying questions (if more info needed)

Return JSON with fields:
- decision: { shouldResolveDirectly: boolean, responseType: "resolution"|"escalation"|"clarification", confidence: 0-100, riskLevel: "low"|"medium"|"high"|"critical" }
- response: string (your support response - max 300 words)
- actionItems: { escalateToSupport: boolean, escalationReason?: string, suggestedCategory?: string }`,
      },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      decision: {
        shouldResolveDirectly: result.decision?.shouldResolveDirectly ?? false,
        responseType: result.decision?.responseType ?? "escalation",
        confidence: result.decision?.confidence ?? 50,
        riskLevel: result.decision?.riskLevel ?? "medium",
      },
      response: result.response || "Thank you for your message. Our support team will review this shortly.",
      actionItems: {
        escalateToSupport: result.actionItems?.escalateToSupport ?? sentiment.needsEscalation,
        escalationReason: result.actionItems?.escalationReason || sentiment.reason,
        suggestedCategory: result.actionItems?.suggestedCategory,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.sentimentScore,
      },
    };
  } catch (err) {
    console.error("[generateSupportResponse] parse error:", err);
    return {
      decision: {
        shouldResolveDirectly: false,
        responseType: "escalation",
        confidence: 50,
        riskLevel: "high",
      },
      response: "Thank you for reaching out. Our support team will assist you shortly.",
      actionItems: {
        escalateToSupport: true,
        escalationReason: "Unable to parse AI response",
      },
    };
  }
}

/**
 * Main support agent handler
 * POST /api/ai/agents/support
 */
export const POST = withHandler(async (req: NextRequest) => {
  await connectDB();
  const user = await requireUser();

  const body = await req.json();
  const input: SupportQueryInput = {
    ticketId: body.ticketId,
    userId: body.userId || user.userId,
    message: body.message,
    category: body.category,
    previousMessages: body.previousMessages,
  };

  // Validate input
  if (!input.message || input.message.trim().length < 5) {
    return NextResponse.json(
      { error: "Message must be at least 5 characters" },
      { status: 400 }
    );
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 }
    );
  }

  try {
    // Generate AI response
    const agentResponse = await generateSupportResponse(input, client);

    // Determine confidence and risk
    const confidence = agentResponse.decision.confidence;
    const shouldEscalate =
      agentResponse.actionItems?.escalateToSupport ||
      confidence < 60 ||
      agentResponse.decision.riskLevel !== "low";

    // Create AI decision record
    const decision = await AIDecisionService.createDecision({
      type: "SUPPORT",
      agentName: "support_agent",
      recommendation: agentResponse.response,
      confidenceScore: confidence,
      riskLevel: agentResponse.decision.riskLevel,
      supportingEvidence: {
        customerSentiment: agentResponse.actionItems?.sentiment,
        sentimentScore: agentResponse.actionItems?.sentimentScore,
        behavioralFlags: agentResponse.actionItems?.escalationReason
          ? [agentResponse.actionItems.escalationReason]
          : [],
      },
      relatedEntityType: "ticket",
      relatedEntityId: input.ticketId,
    });

    // If should escalate (medium/high confidence needed), queue for approval
    if (shouldEscalate && confidence < 70) {
      // Notify support team for escalation
      if (input.userId) {
        await enqueueNotification({
          userId: input.userId,
          channel: "email",
          category: "support_escalation",
          subject: "Support Ticket Escalated",
          body: agentResponse.actionItems?.escalationReason || "Requires manual review",
          immediate: true,
        });
      }

      return NextResponse.json(
        {
          decision: {
            id: decision._id,
            status: "pending_review",
            type: "SUPPORT",
            confidence,
            riskLevel: agentResponse.decision.riskLevel,
            recommendation: agentResponse.response,
            escalationReason: agentResponse.actionItems?.escalationReason,
            requiresApproval: true,
          },
          message: "Response queued for approval due to complexity/urgency.",
        },
        { status: 202 }
      );
    }

    // If low-risk resolution, send directly
    return NextResponse.json(
      {
        decision: {
          id: decision._id,
          status: "approved",
          type: "SUPPORT",
          confidence,
          riskLevel: agentResponse.decision.riskLevel,
          recommendation: agentResponse.response,
          sentSentimentScore: agentResponse.actionItems?.sentimentScore,
        },
        response: agentResponse.response,
        message: "Response sent to customer",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Support Agent] error:", error);
    return NextResponse.json(
      { error: "Failed to process support request" },
      { status: 500 }
    );
  }
});
