/**
 * Outreach Agent
 * Generates personalized outreach messages for customer engagement
 * POST /api/ai/agents/outreach-agent
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface OutreachInput {
  userId: string;
  userProfile: {
    role: "client" | "provider";
    name: string;
    accountAgeInDays: number;
    engagementLevel: "inactive" | "low" | "medium" | "high";
  };
  actionType:
    | "fund_escrow"
    | "complete_profile"
    | "leave_review"
    | "recommend_provider"
    | "recommend_job"
    | "return_to_app"
    | "upsell_plan";
  context: {
    jobId?: string;
    jobTitle?: string;
    pendingAmount?: number;
    lastEngagementDaysAgo: number;
    recommendedItems?: Array<{
      id: string;
      title: string;
      relevanceScore: number;
    }>;
  };
}

interface OutreachMessage {
  subject: string;
  body: string;
  cta: {
    text: string;
    url: string;
  };
  channel: "email" | "push" | "sms";
  timing: {
    bestHour: number; // 0-23 UTC
    bestDayOfWeek: number; // 0-6
  };
  personalizationLevel: "high" | "medium" | "low";
  estimatedClickRate: number; // 0-100
}

export async function POST(req: NextRequest) {
  try {
    const input: OutreachInput = await req.json();

    // Channel selection based on engagement
    let channel: "email" | "push" | "sms" = "email";
    if (input.userProfile.engagementLevel === "high") channel = "push"; // High engagement = push notification
    if (input.actionType === "fund_escrow") channel = "sms"; // Urgent = SMS

    // Best time calculation (simplified)
    let bestHour = 10; // 10 AM default
    if (input.userProfile.role === "provider") bestHour = 14; // Providers check in afternoon
    let bestDay = 3; // Wednesday default (mid-week engagement)

    const prompt = `You are an expert in personalized customer engagement. Create a compelling outreach message.

User: ${input.userProfile.name} (${input.userProfile.role}, ${input.userProfile.accountAgeInDays} days old, ${input.userProfile.engagementLevel} engagement)
Action: ${input.actionType}
Last Active: ${input.context.lastEngagementDaysAgo} days ago
${input.context.jobTitle ? `Job: ${input.context.jobTitle}` : ""}
${input.context.pendingAmount ? `Pending Amount: ₱${input.context.pendingAmount}` : ""}

Action Context:
${
  input.actionType === "fund_escrow"
    ? "User has unfunded escrow - encourage to fund to protect both parties"
    : input.actionType === "complete_profile"
      ? "User profile incomplete - missing certifications/documents"
      : input.actionType === "leave_review"
        ? "User completed job - ask for honest review"
        : input.actionType === "recommend_provider"
          ? "Recommend suitable providers based on history"
          : input.actionType === "recommend_job"
            ? "Recommend new jobs matching their skills"
            : input.actionType === "return_to_app"
              ? "User hasn't logged in recently - re-engage"
              : "Suggest premium plan upgrade"
}

Create:
1. Engaging subject line
2. Personalized message body (2-3 sentences)
3. Clear call-to-action
4. Channel suggestion
5. Best time to send
6. Personalization approach
7. Estimated click rate

Response format:
{
  "subject": "<subject>",
  "body": "<message>",
  "cta": {
    "text": "<button text>",
    "url": "<destination>"
  },
  "channel": "email|push|sms",
  "bestHour": <0-23>,
  "bestDay": <0-6>,
  "personalizationLevel": "high|medium|low",
  "estimatedClickRate": <0-100>
}

Requirements:
- Personalize with actual name (use placeholder if needed)
- Call-to-action must be specific and urgency-driven
- For ${input.userProfile.role}s: ${input.userProfile.role === "provider" ? "Focus on earnings/ratings" : "Focus on convenience/safety"}
- Keep tone friendly but professional
- Add urgency if ${input.context.lastEngagementDaysAgo} > 30 days`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a personalization expert. Create messages that drive engagement without being pushy. Return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.6, // Higher temp for more creative variations
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const message = JSON.parse(content) as OutreachMessage;

    // Override channel based on logic
    message.channel = channel;

    // Adjust timing
    message.timing = {
      bestHour,
      bestDayOfWeek: bestDay,
    };

    // Adjust personalization level
    if (input.context.jobTitle) message.personalizationLevel = "high";
    else if (input.userProfile.engagementLevel === "inactive") message.personalizationLevel = "high"; // High personalization for inactive users
    else message.personalizationLevel = "medium";

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        timing: {
          bestHour: message.timing.bestHour,
          bestDayOfWeek: message.timing.bestDayOfWeek,
        },
      },
    });
  } catch (error) {
    console.error("[Outreach Agent] Error:", error);
    return NextResponse.json(
      { error: "Outreach generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
